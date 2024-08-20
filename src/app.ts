import 'reflect-metadata';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { Container } from 'typedi';
import session from 'express-session';
import RedisStore from 'connect-redis';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { generateSchema } from '@anatine/zod-openapi';
import { NODE_ENV, PORT, LOG_FORMAT, ORIGIN, CREDENTIALS, SESSION_SECRET_KEY } from '@config/index';
import { Routes } from '@interfaces/routes.interface';
import { ErrorMiddleware } from '@middlewares/error.middleware';
import { logger, stream } from '@utils/logger';
import { sequelize } from './config/sequelize';
import { LocationHierarchySchema, PropertyDetailResponseSchema, PropertyResponseSchema } from './models/property.schema';
import { RedisService } from './services/redis.service';

export class App {
  public app: express.Application;
  public env: string;
  public port: string | number;
  private redis = Container.get(RedisService);

  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  public listen() {
    this.app
      .listen(this.port, () => {
        logger.info(`=================================`);
        logger.info(`======= ENV: ${this.env} =======`);
        logger.info(`🚀 App listening on the port ${this.port}`);
        logger.info(`=================================`);
        sequelize
          .authenticate()
          .then(() => {
            logger.info('Connection has been established successfully.');
          })
          .catch((error: Error) => {
            logger.error('Unable to connect to the database:', error);
          });
      })
      .on('error', (error: NodeJS.ErrnoException) => {
        logger.error('Error occurred while starting the server', error);
      });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(cors({ origin: ORIGIN, credentials: CREDENTIALS }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.use(
      session({
        store: new RedisStore({ client: this.redis.getRedisClient() }),
        secret: SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: false,
      }),
    );
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use('/', route.router);
    });
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        openapi: '3.0.0',
        info: {
          title: 'Scrapper Zameen Backend API',
          version: '1.0.0',
          description:
            'This is the backend for the scrapper_zameen application. It provides RESTful APIs to support the frontend application and manages the core business logic and data storage.',
        },
        servers: [
          {
            url: '/',
            description: 'Local server',
          },
          {
            url: '/api/server',
            description: 'API server',
          },
        ],
        components: {
          schemas: {
            Property: generateSchema(PropertyResponseSchema, undefined, '3.0'),
            PropertyDetails: generateSchema(PropertyDetailResponseSchema, undefined, '3.0'),
            LocationHierarchy: generateSchema(LocationHierarchySchema, undefined, '3.0'),
          },
        },
        paths: {},
      },
      apis: ['swagger.yaml'],
    };

    const specs = swaggerJSDoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  private initializeErrorHandling() {
    this.app.use(ErrorMiddleware);
  }
}

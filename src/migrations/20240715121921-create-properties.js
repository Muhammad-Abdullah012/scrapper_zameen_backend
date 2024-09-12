'use strict';
const { TABLE_NAME: CITIES_TABLE } = require('./20240713080551-create-city');
const { TABLE_NAME: LOCATIONS_TABLE } = require('./20240714103816-locations');
const TABLE_NAME = 'properties';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  TABLE_NAME,
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      description: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      header: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.DataTypes.ENUM(
          'agricultural_land',
          'building',
          'commercial_plot',
          'factory',
          'farm_house',
          'flat',
          'house',
          'industrial_land',
          'office',
          'other',
          'penthouse',
          'plot_file',
          'plot_form',
          'residential_plot',
          'room',
          'shop',
          'lower_portion',
          'upper_portion',
          'warehouse',
        ),
        allowNull: true,
      },
      price: {
        type: Sequelize.DataTypes.FLOAT,
        allowNull: true,
      },
      location_id: {
        type: Sequelize.DataTypes.INTEGER,
        references: {
          model: LOCATIONS_TABLE,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      },
      bath: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      area: {
        type: Sequelize.DataTypes.FLOAT,
        allowNull: true,
      },
      purpose: {
        type: Sequelize.DataTypes.ENUM('for_sale', 'for_rent'),
        allowNull: true,
      },
      bedroom: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      added: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      initial_amount: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      monthly_installment: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      remaining_installments: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      url: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      cover_photo_url: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      available: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      features: {
        type: Sequelize.DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      city_id: {
        type: Sequelize.DataTypes.INTEGER,
        references: {
          model: CITIES_TABLE,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      },
    });
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN ${TABLE_NAME}.area IS 'Area is in square feet';
    `);
    await queryInterface.addIndex(TABLE_NAME, ['location_id']);
    await queryInterface.addIndex(TABLE_NAME, ['city_id']);
  },
  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable(TABLE_NAME);
  },
};

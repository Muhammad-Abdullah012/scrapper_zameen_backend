'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS CountPropertiesForSaleView AS
      SELECT "type", COUNT("type") AS "count" FROM "properties" AS "Property" WHERE "Property"."purpose" = 'for_sale' AND "Property"."price" >= '1' AND "Property"."area" > '0' GROUP BY "type";
  `);
    await queryInterface.sequelize.query(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS CountPropertiesForRentView AS
    SELECT "type", COUNT("type") AS "count" FROM "properties" AS "Property" WHERE "Property"."purpose" = 'for_rent' AND "Property"."price" >= '1' AND "Property"."area" > '0' GROUP BY "type";
`);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS CountPropertiesForSaleView;`);
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS CountPropertiesForRentView;`);
  },
};

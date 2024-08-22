'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS CountPropertiesView AS
      SELECT "type", "purpose", COUNT("type") AS "count" FROM "properties" AS "Property" WHERE "Property"."price" >= '1' AND "Property"."area" > '0' GROUP BY "type", "purpose";
  `);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS CountPropertiesView;`);
  },
};

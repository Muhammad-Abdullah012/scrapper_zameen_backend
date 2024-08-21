'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS FeaturedPropertiesView AS
      SELECT "Property".*, "Location"."name" AS "location", "City"."name" AS "city", "Agency"."title" AS "agency" FROM "properties" AS "Property" LEFT OUTER JOIN "locations" AS "Location" ON "Property"."location_id" = "Location"."id" LEFT OUTER JOIN "cities" AS "City" ON "Property"."city_id" = "City"."id" LEFT OUTER JOIN "agencies" AS "Agency" ON "Property"."agency_id" = "Agency"."id" WHERE "Property"."purpose" = 'for_sale' AND "Property"."price" >= '30000000' ORDER BY "Property"."price" ASC;
  `);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`DROP VIEW IF EXISTS FeaturedPropertiesView;`);
  },
};

'use strict';
const { TABLE_NAME: LOCATIONS_TABLE } = require('./20240714103816-locations');
const { TABLE_NAME: CITIES_TABLE } = require('./20240713080551-create-city');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(LOCATIONS_TABLE, 'city_id', {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.sequelize.query(`
      UPDATE ${LOCATIONS_TABLE}
      SET city_id = ${CITIES_TABLE}.id
      FROM ${CITIES_TABLE}
      WHERE ${LOCATIONS_TABLE}.name ILIKE '%' || ${CITIES_TABLE}.name || '%';
    `);
    return queryInterface.addConstraint(LOCATIONS_TABLE, {
      type: 'FOREIGN KEY',
      fields: ['city_id'],
      name: 'fk_cities',
      references: {
        table: CITIES_TABLE,
        field: 'id',
      },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, _Sequelize) {
    return queryInterface.removeColumn('locations', 'city_id');
  },
};

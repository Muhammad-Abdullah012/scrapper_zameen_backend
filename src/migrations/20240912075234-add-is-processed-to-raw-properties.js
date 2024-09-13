'use strict';
const { TABLE_NAME: RAW_PROPERTIES_TABLE } = require('./20240827052844-create-raw-property-table');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(RAW_PROPERTIES_TABLE, 'is_processed', {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn(RAW_PROPERTIES_TABLE, 'is_processed');
  },
};

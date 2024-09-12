'use strict';
const { TABLE_NAME: PROPERTIES_TABLE } = require('./20240715121921-create-properties');
const { TABLE_NAME: AGENCY_TABLE } = require('./20240813055146-create-agency-table');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(PROPERTIES_TABLE, 'agency_id', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: AGENCY_TABLE,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex(PROPERTIES_TABLE, ['agency_id']);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn(PROPERTIES_TABLE, 'agency_id');
  },
};

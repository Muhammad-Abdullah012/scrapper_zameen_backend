'use strict';

const { TABLE_NAME: CITIES_TABLE } = require('./20240713080551-create-city');
const TABLE_NAME = 'urls';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  TABLE_NAME,
  async up(queryInterface, Sequelize) {
    const { DataTypes, literal } = Sequelize;
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      city_id: {
        type: DataTypes.INTEGER,
        references: {
          model: CITIES_TABLE,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      },
      is_processed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE TRIGGER update_table_trigger
      BEFORE UPDATE ON ${TABLE_NAME}
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at();
    `);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable(TABLE_NAME);
  },
};

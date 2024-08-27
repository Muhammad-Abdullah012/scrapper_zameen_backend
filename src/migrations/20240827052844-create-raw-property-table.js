'use strict';

const TABLE_NAME = 'raw_properties';

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
      html: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      city_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      external_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
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

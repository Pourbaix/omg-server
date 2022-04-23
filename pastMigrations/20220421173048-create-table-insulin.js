'use strict';

module.exports = {
  up: (queryInterface, Sequelize)  => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.createTable('Insulin', {
          id: {
            type: Sequelize.DataTypes.UUID,
            defaultValue: Sequelize.UUIDV4,
            allowNull: false,
            primaryKey: false
          },
          datetime:{
            type: Sequelize.DataTypes.DATE,
            allowNull: false,
            primaryKey: true
          },
          carbInput:{
            type: Sequelize.DataTypes.INTEGER(3),
            allowNull: false
          },
          userId:{
            type: Sequelize.DataTypes.UUID,
            allowNull: false,
            references: {
              model: {
                tableName: 'users',
              },
              key: 'id'
            },
            primaryKey: true
          }
        }, { transaction: t })
      ]);
    });
  },
  down: (queryInterface, Sequelize)  => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.dropTable('Insulin', { transaction: t }),
      ]);
    });
  }
};

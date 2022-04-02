'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('Data', 'carbInput', {
          type: Sequelize.DataTypes.INTEGER
        }, { transaction: t }),
        queryInterface.addColumn('Data', 'carbInputDatetime', {
          type: Sequelize.DataTypes.DATE
        }, { transaction: t })
      ]);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('Data', 'carbInput', { transaction: t }),
        queryInterface.removeColumn('Data', 'carbInputDatetime', { transaction: t })
      ]);
    });
  }
};

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('Tags', 'isPending', {
          type: Sequelize.DataTypes.BOOLEAN
        }, { transaction: t }),
        queryInterface.addColumn('Tags', 'wasAuto', {
          type: Sequelize.DataTypes.BOOLEAN
        }, { transaction: t })
      ]);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('Tags', 'isPending', { transaction: t }),
        queryInterface.removeColumn('Tags', 'wasAuto', { transaction: t })
      ]);
    });
  }
};

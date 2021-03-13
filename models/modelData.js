const seq = require("../config/config");
const Sequelize = seq.Sequelize, Model = seq.Model, sequelize = seq.sequelize, DataTypes = seq.DataTypes;
const User = require("./modelUser");

const Data = sequelize.define('data',{
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    datetime:{
        type: DataTypes.DATE,
        allowNull: false
    },
    glucose:{
        type: DataTypes.INTEGER(3),
        allowNull: false
    },
    userId:{
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'data',
});

module.exports = Data;

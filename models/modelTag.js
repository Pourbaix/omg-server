const seq = require("../config/config");
const Sequelize = seq.Sequelize, Model = seq.Model, sequelize = seq.sequelize, DataTypes = seq.DataTypes;
const User = require("./modelUser");

const Tag = sequelize.define('tag',{
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
    },
    name:{
        type: DataTypes.STRING,
        allowNull: false
    },
    startDatetime:{
        type: DataTypes.DATE,
        allowNull: false
    },
    endDatetime:{
        type: DataTypes.DATE,
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
    modelName: 'tag',
});

module.exports = Tag;

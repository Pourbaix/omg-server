//////////////////////////////////////////////////////
/////////// Sequelize Detection Ranges model (table) //////////////
//////////////////////////////////////////////////////

const seq = require("../config/config");
const Sequelize = seq.Sequelize, Model = seq.Model, sequelize = seq.sequelize, DataTypes = seq.DataTypes;
const User = require("./modelUser");

const DetectionRanges = sequelize.define('detectionranges',{
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
    fromTime:{
        type: DataTypes.DATE,
        allowNull: false
    },
    toTime:{
        type: DataTypes.DATE,
        allowNull: false
    },
    daysSelected:{
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
    modelName: 'detectionranges',
});

module.exports = DetectionRanges;


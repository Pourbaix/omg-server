//////////////////////////////////////////////////////
////////// Sequelize Insulin model (table) //////////////
//////////////////////////////////////////////////////

const seq = require("../config/config");
const Sequelize = seq.Sequelize, sequelize = seq.sequelize, DataTypes = seq.DataTypes;
const User = require("./modelUser");

const Insulin = sequelize.define('insulin',{
    id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: false
    },
    datetime:{
        type: DataTypes.DATE,
        allowNull: false,
        primaryKey: true
    },
    carbInput:{
        type: DataTypes.INTEGER(3),
        allowNull: false
    },
    userId:{
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        primaryKey: true
    }
}, {
    sequelize,
    modelName: 'insulin',
})

module.exports = Insulin;

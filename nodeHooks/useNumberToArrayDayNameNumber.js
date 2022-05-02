
const useNumberToArrayDayNameNumber = (number) => {
    let daysNumbers = [];
    let bitDays = number.toString(2);
    let j = 0;
    for (let i = bitDays.length; i > 0; i--) {
        // console.log(bitDays[i-1]);
        if (bitDays[i - 1] == "1") {
            daysNumbers.push(j);
        }
        j++;
    }
    return daysNumbers;
}

module.export = {
    useNumberToArrayDayNameNumber,
};

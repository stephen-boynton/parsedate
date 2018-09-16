const moment = require('moment');
const { wordsToNumbers } = require('words-to-numbers');
const {
  indexOf,
  gt,
  lt,
  startCase,
  drop,
  concat,
  pipe,
  add,
  head,
  split,
  parseInt,
  last,
  lowerCase
} = require('lodash/fp');

class ParseDate {
  constructor() {
    this.regDays = /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i;
    this.regNumWord = /one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve/i;
    this.regTimeWords = /minute|min|hour|day|week|month|year/i;
    this.regNum = /[0-9]{1,2}/;
    this.regMinNum = /:[0-9]{1,2}/;
    this.daysOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
    this.monthsOfYear = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    this.now = moment();
    this.dayNum = moment().day();
    this.dayString = this.daysOfWeek[this.dayNum];
    this.monthNum = moment().month();
    this.monthString = this.monthsOfYear[this.monthNum];
  }

  get getDayString() {
    return this.dayString;
  }

  get getDayNum() {
    return this.dayNum;
  }

  get getMonthString() {
    return this.monthString;
  }

  get getMonthNum() {
    return this.monthNum;
  }

  determineWhenIndex(when) {
    return pipe(
      concat(this.daysOfWeek),
      drop(this.dayNum),
      indexOf(when),
      add(this.dayNum)
    )(this.daysOfWeek);
  }

  determineDay(message) {
    let day;
    const when = startCase(this.regDays.exec(message)[0]);
    const whenIndex = this.determineWhenIndex(when);
    if (/next/i.test(message)) {
      day = gt(this.dayNum, whenIndex)
        ? this.dayNum - whenIndex + 7
        : lt(this.dayNum, whenIndex)
          ? whenIndex - this.dayNum + 7
          : this.dayNum + 7;
    } else if (this.regDays.test(message)) {
      day = gt(this.dayNum, whenIndex)
        ? this.dayNum - whenIndex
        : lt(this.dayNum, whenIndex)
          ? whenIndex - this.dayNum
          : this.dayNum + 6;
    }
    return day;
  }

  determineTime(message) {
    if (/ at /i.test(message)) {
      const isAm = /am|a.m./i.test(message);
      let hour =
        head(this.regNum.exec(message)) ||
        wordsToNumbers(head(this.regNumWord.exec(message)));
      let min = last(split(':', head(this.regMinNum.exec(message))));
      if (hour === 12) {
        hour = 0;
      }

      if (isAm) {
        return {
          hour: parseInt(hour, 10),
          min: min ? min : 0
        };
      } else {
        // assuming pm by default
        return {
          hour: parseInt(hour, 10) + 12,
          min: min ? min : 0
        };
      }
    }
  }

  getDateFromDayTime(day, { hour, min } = {}) {
    return moment().set({
      date: moment()
        .add(day, 'd')
        .format('DD'),
      year: moment()
        .day(day)
        .format('YYYY'),
      hour: hour,
      minute: min,
      second: 0
    });
  }

  formatForCron(date) {
    return split(',', moment(date).format('YYYY,MM,DD,HH,mm,ss'));
  }

  determineByAmountAndMeasure(message) {
    const relative = last(split(' in ', message)); //?
    const [stringAmount, fullMeasure] = split(' ', lowerCase(relative)); //?
    const amount = wordsToNumbers(stringAmount) || parseInt(stringAmount);
    const shortMeasure = fullMeasure === 'month' ? 'M' : head(fullMeasure); //?
    return moment()
      .add(amount, shortMeasure)
      .toDate(); //?
  }

  getDateTimeFromMessage(message) {
    const hasDayOfWeek = head(this.regDays.exec(message)); //?
    if (hasDayOfWeek) {
      const day = this.determineDay(message);
      const time = this.determineTime(message);
      return this.getDateFromDayTime(day, time).toDate();
    }
    return this.determineByAmountAndMeasure(message);
  }

  getCronDateFromMessage(message) {
    const day = this.determineDay(message);
    const time = this.determineTime(message);
    const dayAndTime = this.getDateFromDayTime(day, time);
    return this.formatForCron(dayAndTime);
  }
}

module.exports = function parseDateFactory() {
  return new ParseDate();
};

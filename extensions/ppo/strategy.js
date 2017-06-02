var z = require('zero-fill')
  , n = require('numbro')

module.exports = function container (get, set, clear) {
  return {
    name: 'ppo',
    description: 'Buy when (PPO - Signal > 0) and sell when (PPO - Signal < 0).',

    getOptions: function () {
      this.option('period', 'period length', String, '20m')
      this.option('min_periods', 'min. number of history periods', Number, 52)
      this.option('ema_short_period', 'number of periods for the shorter EMA', Number, 12)
      this.option('ema_long_period', 'number of periods for the longer EMA', Number, 26)
      this.option('signal_period', 'number of periods for the signal EMA', Number, 9)
    },

    calculate: function (s) {
      get('lib.ema')(s, 'ema_long', s.options.ema_long_period)
      get('lib.ema')(s, 'ema_short', s.options.ema_short_period)
      if (s.period.ema_short && s.period.ema_long) {
        s.period.ppo = (s.period.ema_short - s.period.ema_long)
        get('lib.ema')(s, 'signal', s.options.signal_period, 'ppo')
        if (s.period.signal) {
          s.period.ppo_histogram = s.period.ppo - s.period.signal
        }
      }
    },

    onPeriod: function (s, cb) {
      if (typeof s.period.ppo_histogram === 'number' && typeof s.lookback[0].ppo_histogram === 'number') {
        if (s.period.ppo_histogram > 0 && s.lookback[0].ppo_histogram <= 0) {
          s.signal = 'buy';
        } else if (s.period.ppo_histogram < 0 && s.lookback[0].ppo_histogram >= 0) {
          s.signal = 'sell';
        } else {
          s.signal = null;
        }
      }
      cb()
    },

    onReport: function (s) {
      var cols = []
      if (typeof s.period.ppo_histogram === 'number') {
        var color = 'grey'
        if (s.period.ppo_histogram > 0) {
          color = 'green'
        }
        else if (s.period.ppo_histogram < 0) {
          color = 'red'
        }
        // cols.push(z(10, n(s.period.ema_short).format('0.0000'), ' ')[color])
        // cols.push(z(10, n(s.period.ema_long).format('0.0000'), ' ')[color])
        // cols.push(z(10, n(s.period.ppo).format('0.0000'), ' ')[color])
        // cols.push(z(10, n(s.period.signal).format('0.0000'), ' ')[color])
        cols.push(z(8, n(s.period.ppo_histogram).format('+000.00'), ' ')[color])
      }
      else {
        cols.push('         ')
      }
      return cols
    }
  }
}
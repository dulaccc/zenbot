var z = require('zero-fill')
  , n = require('numbro')

module.exports = function container (get, set, clear) {
  return {
    name: 'macd',
    description: 'Buy when (MACD - Signal > 0) and sell when (MACD - Signal < 0).',

    getOptions: function () {
      this.option('period', 'period length', String, '1h')
      this.option('min_periods', 'min. number of history periods', Number, 52)
      this.option('ema_short_period', 'number of periods for the shorter EMA', Number, 12)
      this.option('ema_long_period', 'number of periods for the longer EMA', Number, 26)
      this.option('signal_period', 'number of periods for the signal EMA', Number, 9)
      this.option('up_trend_threshold', 'threshold to trigger a buy signal', Number, 0)
      this.option('down_trend_threshold', 'threshold to trigger a sold signal', Number, 0)
      this.option('custom_rsi_periods', 'number of periods for overbought RSI (otherwise defaults to config)', Number, 25)
      this.option('overbought_rsi', 'sold when RSI exceeds this value', Number, 80)
      this.option('buy_rsi_threshold', 'avoid buying if RSI exceeds this value', Number, 68)
    },

    calculate: function (s) {
      if (s.options.custom_rsi_periods) {
        // sync RSI display with overbought RSI periods
        s.options.rsi_periods = s.options.custom_rsi_periods
      }

      // update RSI value
      get('lib.rsi')(s, 'rsi', s.options.rsi_periods)

      // detect overbought
      if (s.options.overbought_rsi) {
        if (!s.in_preroll && s.period.rsi >= s.options.overbought_rsi && !s.overbought) {
          s.overbought = true
          if (s.options.mode === 'sim' && s.options.verbose) console.log(('\noverbought at ' + s.period.overbought_rsi + ' RSI, preparing to sold\n').cyan)
        }
      }

      // compture MACD
      get('lib.ema')(s, 'ema_short', s.options.ema_short_period)
      get('lib.ema')(s, 'ema_long', s.options.ema_long_period)
      if (s.period.ema_short && s.period.ema_long) {
        s.period.macd = (s.period.ema_short - s.period.ema_long)
        get('lib.ema')(s, 'signal', s.options.signal_period, 'macd')
        if (s.period.signal) {
          s.period.macd_histogram = s.period.macd - s.period.signal
        }
      }
    },

    onPeriod: function (s, cb) {
      if (!s.in_preroll && typeof s.period.rsi === 'number') {
        if (s.overbought) {
          s.overbought = false
          s.trend = 'overbought'
          s.signal = 'sold'
          return cb()
        }
      }

      if (typeof s.period.macd_histogram === 'number' && typeof s.lookback[0].macd_histogram === 'number') {
        if (s.period.macd_histogram > s.options.up_trend_threshold && s.lookback[0].macd_histogram <= 0) {
          if (s.period.rsi >= s.options.buy_rsi_threshold) {
            s.signal = null
            if (s.options.mode === 'sim' && s.options.verbose) console.log(('\nbuy cancelled because of RSI is too high: ' + s.period.rsi + ' > ' + s.options.buy_rsi_threshold + '\n').cyan)
            return cb()
          } else {
            s.signal = 'buy'
          }
        } else if (s.period.macd_histogram < s.options.down_trend_threshold && s.lookback[0].macd_histogram >= 0) {
          s.signal = 'sell'
        } else {
          // if the positive MACD loose more than 30% in 1h, then we sell
          // if (s.period.macd_histogram > 0 && s.lookback[0].macd_histogram >= 0 && s.lookback[0].macd_histogram >= 7.0) {
          //   var decrease_rate = (s.lookback[0].macd_histogram - s.period.macd_histogram) / s.lookback[0].macd_histogram
          //   if (decrease_rate > 0.30) {
          //     s.signal = 'sell'
          //     return cb()
          //   }
          // }

          s.signal = null  // hold
        }
      }
      return cb()
    },

    onReport: function (s) {
      var cols = []
      if (typeof s.period.macd_histogram === 'number') {
        var color = 'grey'
        if (s.period.macd_histogram > 0) {
          color = 'green'
        }
        else if (s.period.macd_histogram < 0) {
          color = 'red'
        }
        cols.push(z(8, n(s.period.macd_histogram).format('+00.0000'), ' ')[color])
        cols.push(z(8, n(s.period.rsi).format('00.0'), ' ').cyan)
      }
      else {
        cols.push('         ')
      }
      return cols
    }
  }
}
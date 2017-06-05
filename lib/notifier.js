var request = require('request'),
    n = require('numbro'),
    moment = require('moment')

module.exports = function container (get, set, clear) {
  return function notifier (bot_token, user_id) {

    var _send_notification = function(msg) {
      var url = 'https://api.telegram.org/bot' + bot_token + '/sendMessage'
      var post_data = {
        'chat_id': user_id,
        'text' : msg,
        'parse_mode': "Markdown"
      }

      request.post({ url: url, formData: post_data}, function (error, response, body) {
        if (error) {
          return console.error('error:', error);
        }
        // console.log('statusCode:', response && response.statusCode);
        // console.log('body:', body);
      })
    }

    var on_signal = function(s, strategy, period_size) {
      if (s.signal === null) {
        return
      }

      // console.log("Signal *" + s.signal + "* triggered")

      var text = ""
      text += "*" + strategy.toUpperCase() + " " + s.signal + "* signal, period " + period_size
      text += "\nvol: " + n(s.period.volume).format('0.00') + " BTC"
      text += "\nclose: " + n(s.period.close).format('0.000')

      if (strategy === 'macd') {
        // custom indications
        text += "\nmacd: " + n(s.period.macd).format('+0.000') + ", signal: " + n(s.period.signal).format('+0.000')
        text += "\nrsi: " + n(s.period.rsi).format('0.0')
      }

      _send_notification(text)
    }

    var on_trade = function(type, trade, s) {
      // console.log("Trade *" + type + "* completed")

      function fa(amt) {
        return n(amt).format('0.00000000') + ' ' + s.asset
      }

      function isFiat () {
        return !s.currency.match(/^BTC|ETH|XMR|USDT$/)
      }

      function fc(amt) {
        var str
        if (isFiat()) {
          str = n(amt).format('0.00')
        }
        else {
          str = n(amt).format('0.00000000')
          if (str.split('.')[1].length === 7) str += '0'
        }
        return str + ' ' + s.currency
      }

      var orig_price = 0
      if (type === 'buy_order') {
        orig_price = s.buy_order.orig_price
      } else if (type === 'sell_order') {
        orig_price = s.sell_order.orig_price
      }

      var text = ""
      text += "*" + type + " * completed at " + moment(trade.time).format('YYYY-MM-DD HH:mm:ss')
      text += "\nbuy: " + fa(trade.size) + " at " + fc(trade.price)
      text += "\ntotal: " + fc(trade.size * trade.price)
      text += "\nslippage: " + n(trade.slippage).format('0.0000%') + " (orig. price " + fc(orig_price) + ")"
      text += "\nexecuted in: " + moment.duration(trade.execution_time).humanize()

      _send_notification(text)
    }

    return {
      notify_signal: on_signal,
      notify_trade: on_trade,
    }
  }
}

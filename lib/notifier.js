var request = require('request'),
    n = require('numbro')

module.exports = function container (get, set, clear) {
  return function notifier (bot_token, user_id) {
    return {
      notify: function(s, strategy, period_size) {
        // console.log("Signal *" + s.signal + "* triggered")

        var text = ""
        text += "*" + strategy.toUpperCase() + " " + s.signal + "* signal, period " + period_size
        text += "\nvol: " + n(s.period.volume).format('0.00') + " BTC"
        text += "\nclose: " + n(s.period.close).format('0.000')

        if (strategy === 'macd') {
          // custom indications
          text += "\nmacd: " + n(s.period.macd).format('+0.000') + ", signal: " + n(s.period.signal).format('+0.000')
          text += "\nrsi: " + n(s.period.overbought_rsi).format('0.0')
        }

        var url = 'https://api.telegram.org/bot' + bot_token + '/sendMessage'
        var post_data = {
          'chat_id': user_id,
          'text' : text,
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
    }
  }
}

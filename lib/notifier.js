var n = require('numbro')
    , moment = require('moment')
    , TeleBot = require('telebot')

module.exports = function container (get, set, clear) {
  return function notifier (bot_token, user_id, strategy_options) {

    // NB: do not store the `strategy_options` instance, to avoid retain cycles and memory leaks
    var strategy = strategy_options.strategy
    var period_size = strategy_options.period
    var buy_pct = strategy_options.buy_pct
    var sell_pct = strategy_options.sell_pct
    var markup_pct = strategy_options.markup_pct
    var order_adjust_time = strategy_options.order_adjust_time
    var sell_stop_pct = strategy_options.sell_stop_pct
    var buy_stop_pct = strategy_options.buy_stop_pct
    var profit_stop_enable_pct = strategy_options.profit_stop_enable_pct = strategy_options.profit_stop_enable_pct
    var profit_stop_pct = strategy_options.profit_stop_pct = strategy_options.profit_stop_pct
    var max_sell_loss_pct = strategy_options.max_sell_loss_pct
    var max_slippage_pct = strategy_options.max_slippage_pct
    var rsi_periods = strategy_options.rsi_periods

    var bot = new TeleBot({
      token: bot_token,
      polling: {
        interval: 1000, // in ms
        timeout: 0, // 0 - short polling
        limit: 100,
        retryTimeout: 5000, // in ms
      },
      allowedUpdates: [], // Optional. List the types of updates you want your bot to receive. Specify an empty list to receive all updates.
      usePlugins: ['commandButton'],
    })


    var lastSnapshotCache = undefined
    var onSnapshotUpdate = function(s) {
      lastSnapshotCache = s
    }

    function fa(amt, s) {
      return n(amt).format('0.00000000') + ' ' + s.asset
    }

    function isFiat(s) {
      return !s.currency.match(/^BTC|ETH|XMR|USDT$/)
    }

    function fc(amt, s) {
      var str
      if (isFiat(s)) {
        str = n(amt).format('0.00')
      }
      else {
        str = n(amt).format('0.00000000')
        if (str.split('.')[1].length === 7) str += '0'
      }
      return str + ' ' + s.currency
    }

    function bindCommands() {
      bot.on(['/strategy'], (msg) => {
        if (lastSnapshotCache === undefined) {
          msg.reply.text('No snapshot registered yet. 😭 Retry later.')
          return
        }

        var s = lastSnapshotCache
        var text = ""
        text += "🎛 *" + strategy.toUpperCase() + " strategy*"
        text += "\nperiod: " + period_size
        text += "\nbuy\\_pct: " + buy_pct
        text += "\nsell\\_pct: " + sell_pct
        text += "\nmarkup\\_pct: " + markup_pct
        text += "\norder\\_adjust\\_time: " + order_adjust_time + "ms"
        text += "\nsell\\_stop\\_pct: " + sell_stop_pct
        text += "\nbuy\\_stop\\_pct: " + buy_stop_pct
        text += "\nprofit\\_stop\\_enable\\_pct: " + profit_stop_enable_pct
        text += "\nprofit\\_stop\\_pct: " + profit_stop_pct
        text += "\nmax\\_sell\\_loss\\_pct: " + max_sell_loss_pct
        text += "\nmax\\_slippage\\_pct: " + max_slippage_pct
        text += "\nrsi\\_periods: " + rsi_periods

        if (strategy === 'macd') {
          // custom indicator
          text += "\n--- " + strategy + " ---"
          text += "\nema\\_short\\_period: " + s.options.ema_short_period
          text += "\nema\\_long\\_period: " + s.options.ema_long_period
          text += "\nsignal\\_period: " + s.options.signal_period
          text += "\nup\\_trend\\_threshold: " + s.options.up_trend_threshold
          text += "\ndown\\_trend\\_threshold: " + s.options.down_trend_threshold
          text += "\noverbought\\_rsi: " + s.options.overbought_rsi
          text += "\n--- "
        }

        bot.sendMessage(msg.from.id, text, {parse: 'Markdown', replyToMessage: msg.message_id})
      })

      bot.on(['/position'], (msg) => {
        if (lastSnapshotCache === undefined) {
          msg.reply.text('No snapshot registered yet. 😭 Retry later.')
          return
        }

        var s = lastSnapshotCache
        var text = ""

        var diff = 0
        if (s.lookback[0]) {
          diff = (s.period.close - s.lookback[0].close) / s.lookback[0].close
          if (diff > 0) {
            text += "📈 "
          } else {
            text += "📉 "
          }
        }

        text += "*Position on " + s.product_id + "*"
        text += "\nclose: " + fc(s.period.close, s)
        text += "\ndiff: " + n(diff).format('+0.0%')

        if (strategy === 'macd') {
          // custom indicator
          text += "\n--- " + strategy + " ---"
          text += "\nrsi: " + n(s.period.rsi).format('0.0')
          text += "\nmacd: " + n(s.period.macd).format('+0.000')
          text += "\nsignal: " + n(s.period.signal).format('+0.000')
          text += "\nmacd - signal: " + n(s.period.macd_histogram).format('+0.000')
          text += "\n---"
        }

        var asset_capital = n(s.balance.asset).format(s.asset === 'BTC' ? '0.00000' : '0.00') + ' ' + s.asset
        var currency_capital = n(s.balance.currency).format(isFiat(s) ? '0.00' : '0.00000') + ' ' + s.currency
        text += "\n" + asset_capital + " / " + currency_capital

        bot.sendMessage(msg.from.id, text, {parse: 'Markdown', replyToMessage: msg.message_id})
      })
    }

    var bindEngineActions = function(engine) {
      bot.on(['/cancel'], (msg) => {
        bot.sendMessage(msg.from.id, "No worries, I won't do anything 😇")
      })

      bot.on(['/buy'], (msg) => {
        if (lastSnapshotCache === undefined) {
          msg.reply.text('No snapshot registered yet. 😭 Retry later.')
          return
        }

        var s = lastSnapshotCache
        var text = ""

        var diff = 0
        if (s.lookback[0]) {
          diff = (s.period.close - s.lookback[0].close) / s.lookback[0].close
          if (diff > 0) {
            text += "📈 "
          } else {
            text += "📉 "
          }
        }

        text += "*Buy order " + s.product_id + "*"
        var currency_capital = n(s.balance.currency).format(isFiat(s) ? '0.00' : '0.00000') + ' ' + s.currency
        text += "\ncapital: " + currency_capital
        text += "\nprice: " + fc(s.period.close, s)
        text += "\ndiff: " + n(diff).format('+0.0%')

        if (strategy === 'macd') {
          // custom indicator
          text += "\n--- " + strategy + " ---"
          text += "\nrsi: " + n(s.period.rsi).format('0.0')
          text += "\nmacd: " + n(s.period.macd).format('+0.000')
          text += "\nsignal: " + n(s.period.signal).format('+0.000')
          text += "\nmacd - signal: " + n(s.period.macd_histogram).format('+0.000')
          text += "\n---"
        }

        // Inline keyboard markup
        const replyMarkup = bot.inlineKeyboard([
            [
                // First row with command callback button
                bot.inlineButton('Yes, buy it!', {callback: '/placebuy'})
            ],
            [
                // Second row with regular command button
                bot.inlineButton('Cancel', {callback: '/cancel'})
            ]
        ])

        // Send message with keyboard markup
        var parseMode = 'Markdown'
        return bot.sendMessage(msg.from.id, text, {parseMode, replyMarkup})
      })

      bot.on(['/sell'], (msg) => {
        if (lastSnapshotCache === undefined) {
          msg.reply.text('No snapshot registered yet. 😭 Retry later.')
          return
        }

        var s = lastSnapshotCache
        var text = ""

        var diff = 0
        if (s.lookback[0]) {
          diff = (s.period.close - s.lookback[0].close) / s.lookback[0].close
          if (diff > 0) {
            text += "📈 "
          } else {
            text += "📉 "
          }
        }

        text += "*Sell order " + s.product_id + "*"
        var asset_capital = n(s.balance.asset).format(s.asset === 'BTC' ? '0.00000' : '0.00') + ' ' + s.asset
        text += "\nasset: " + asset_capital
        text += "\nprice: " + fc(s.period.close, s)
        text += "\ndiff: " + n(diff).format('+0.0%')

        if (strategy === 'macd') {
          // custom indicator
          text += "\n--- " + strategy + " ---"
          text += "\nrsi: " + n(s.period.rsi).format('0.0')
          text += "\nmacd: " + n(s.period.macd).format('+0.000')
          text += "\nsignal: " + n(s.period.signal).format('+0.000')
          text += "\nmacd - signal: " + n(s.period.macd_histogram).format('+0.000')
          text += "\n---"
        }

        // Inline keyboard markup
        const replyMarkup = bot.inlineKeyboard([
            [
                // First row with command callback button
                bot.inlineButton('Yes, sell it!', {callback: '/placesell'})
            ],
            [
                // Second row with regular command button
                bot.inlineButton('Cancel', {callback: '/cancel'})
            ]
        ])

        // Send message with keyboard markup
        var parseMode = 'Markdown'
        return bot.sendMessage(msg.from.id, text, {parseMode, replyMarkup})
      })

      bot.on(['/placebuy'], (msg) => {
        engine.executeSignal('buy')
        return bot.sendMessage(msg.from.id, "Buy order placed! You'll be notified when it's bought")
      })

      bot.on(['/placesell'], (msg) => {
        engine.executeSignal('sell')
        return bot.sendMessage(msg.from.id, "Sell order placed! You'll be notified when it's sold")
      })
    }

    var onSignal = function(s) {
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
        text += "\n--- " + strategy + " ---"
        text += "\nrsi: " + n(s.period.rsi).format('0.0')
        text += "\nmacd: " + n(s.period.macd).format('+0.000') + ", signal: " + n(s.period.signal).format('+0.000')
        text += "\n--- "
      }

      bot.sendMessage(user_id, text, {parse: 'Markdown'})
    }

    var onTrade = function(type, trade, s) {
      // console.log("Trade *" + type + "* completed")

      var action = "<undertermined>"
      var orig_price = 0
      if (type === 'buy_order') {
        action = "bought"
        orig_price = s.buy_order.orig_price
      } else if (type === 'sell_order') {
        action = "sold"
        orig_price = s.sell_order.orig_price
      }

      var text = ""
      text += "*" + type + " * completed at " + moment(trade.time).format('YYYY-MM-DD HH:mm:ss')
      text += "\n" + action + ": " + fa(trade.size, s) + " at " + fc(trade.price, s)
      text += "\ntotal: " + fc(trade.size * trade.price, s)
      text += "\nslippage: " + n(trade.slippage).format('0.0000%') + " (orig. price " + fc(orig_price, s) + ")"
      text += "\nexecuted in: " + moment.duration(trade.execution_time).humanize()

      bot.sendMessage(user_id, text, {parse: 'Markdown'})
    }

    var _ = (function() {
      // bind events
      bindCommands()

      // start polling
      bot.start()
    })()

    return {
      notifySignal: onSignal,
      notifyTrade: onTrade,
      onSnapshotUpdate: onSnapshotUpdate,
      bindEngineActions: bindEngineActions,
    }
  }
}

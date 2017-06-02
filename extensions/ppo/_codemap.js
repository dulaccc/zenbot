module.exports = {
  _ns: 'zenbot',

  'strategies.ppo': require('./strategy'),
  'strategies.list[]': '#strategies.ppo'
}
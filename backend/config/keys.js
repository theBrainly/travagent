// config/keys.js
module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  defaultCommissionRate: parseFloat(process.env.COMMISSION_RATE_DEFAULT) || 10,
  paymentGatewayKey: process.env.PAYMENT_GATEWAY_KEY
};
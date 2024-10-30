const User = require('../../models/User');

const isAuthenticated = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
        next();
      } else {
        // If the user ID in the session doesn't correspond to a valid user, redirect to login
        res.redirect('/auth/login');
      }
    } catch (error) {
      console.error('Error in authentication middleware:', error);
      res.status(500).send('Error during authentication process');
    }
  } else {
    res.redirect('/auth/login'); // Redirect to login page if no userId in session
  }
};

module.exports = {
  isAuthenticated
};
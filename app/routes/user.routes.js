const user = require('../controllers/user.controllers');

module.exports = function (app) {
    app.route(app.rootUrl + '/users/register')
        .post(user.registerUser);
    app.route(app.rootUrl + '/users/login')
        .post(user.loginUser);
    app.route(app.rootUrl + '/users/logout')
        .post(user.logoutUser);
    app.route(app.rootUrl + '/users/:id')
        .get(user.getUser)
        .patch(user.editUser);
    app.route(app.rootUrl + '/users/:id/photo')
        .get(user.getUserPhoto)
        .put(user.setUserPhoto)
        .delete(user.deleteUserPhoto);
};
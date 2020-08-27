const petition = require('../controllers/petition.controllers');

module.exports = function (app) {
    app.route(app.rootUrl + '/petitions')
        .get(petition.viewPetitions)
        .post(petition.addNewPetition);
    app.route(app.rootUrl + '/petitions/categories')
        .get(petition.getCategories);
    app.route(app.rootUrl + '/petitions/:id')
        .get(petition.viewOnePetition)
        .patch(petition.editPetition)
        .delete(petition.deletePetition);
    app.route(app.rootUrl + '/petitions/:id/signatures')
        .get(petition.getPetitionSignatures)
        .post(petition.signPetition)
        .delete(petition.removeSignature);
    app.route(app.rootUrl + '/petitions/:id/photo')
        .put(petition.setPetitionPhoto)
        .get(petition.getPetitionPhoto);
};
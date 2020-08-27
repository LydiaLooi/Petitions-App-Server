const db = require('../../config/db');
const Error = require('./CustomError');
const AttChecker = require('./AttChecker');
const randomToken = require('random-token');
const bcrypt = require('bcryptjs');
const fs = require('file-system');

function generateAuthToken() {
    return randomToken(32);
}

const hashPassword = async (password) => {
    let salt = bcrypt.genSaltSync(5);
    let hash = bcrypt.hashSync(password, salt);
    return hash;

};

const checkPassword = async (password, hash) => {
    return bcrypt.compareSync(password, hash);
};

exports.register = async function (req) {
    let name = req.body.name;
    console.log(`Request to register the user(${name}) into the database~`);
    let email = req.body.email;
    let password = req.body.password;
    let city = req.body.city;
    let country = req.body.country;

    // Validation checks
    AttChecker.checkEmail(email);
    AttChecker.checkString(name, "name", true);
    AttChecker.checkPassword(password);

    if (req.body.hasOwnProperty("city")) {
        AttChecker.checkString(city, "city", true);
    }

    if (req.body.hasOwnProperty("country")) {
        AttChecker.checkString(country, "country", true);
    }

    // Hash the password to store
    password = await hashPassword(password);

    const connection = await db.getPool().getConnection();
    try {
        const query = 'insert into User (name, email, password, city, country) values (?,?,?,?,?)';
        const [result] = await connection.query(query, [name, email, password, city, country]);
        return {
            userId: result.insertId
        }
    } catch (err) {
        throw new Error.BadRequestError(err);
    } finally {
        connection.release();
    }

};

exports.login = async function (email, password) {
    console.log(`Request to login a user(${email}) into the database~`);

    // Validation check
    AttChecker.checkEmail(email);

    const connection = await db.getPool().getConnection();

    try {
        let token = generateAuthToken();
        let query = 'select user_id, password from User where email = ?';
        let [users] = await connection.query(query, [email]);

        if (users[0] == null) {
            throw new Error.BadRequestError("Email does not exist");
        }

        // console.log("Checking password:", password, users[0].password, checkPassword(password, users[0].))


        if (!await checkPassword(password, users[0].password)) { // Password (plaintext) doesn't match given
            // if (password !== users[0].password) { // Password (plaintext) doesn't match given
                throw new Error.UnauthorizedError("Incorrect password");
            // }
        }

        let user_id = users[0].user_id;
        console.log(`Updating user ${user_id} with generated token~`);
        query = 'update User set auth_token = ? where user_id = ? and email = ?'
        let [result] = await connection.query(query, [token, user_id, email]);
        return {
            userId: user_id,
            token: token
        };
    } catch (err) {
        if (err instanceof Error.BadRequestError) {
            throw err;
        } else {
            throw new Error.BadRequestError(err); // Lol imagine this happening
        }
    } finally {
        connection.release();
    }

};

exports.logout = async function (token) {
    console.log("Request to logout with token~");
    if (token == null) {
        throw new Error.UnauthorizedError("Token is null");
    }
    const connection = await db.getPool().getConnection();

    try {

        let query = 'select user_id from User where auth_token = ?';
        let [users] = await connection.query(query, [token]);
        if (users[0] == null) {
            throw new Error.UnauthorizedError("Invalid token");
        }
        query = 'update User set auth_token = null where auth_token = ?';
        let [result] = await connection.query(query, [token]);
        return result;
    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }
};


exports.getInfo = async function (user_id, token) {
    console.log(`Request to get info of user ${user_id}~`);
    const connection = await db.getPool().getConnection();

    try {
        let query;
        query = 'select name, city, country, email, auth_token from User where user_id = ?';
        let [result] = await connection.query(query, [user_id]);
        if (result[0] == null) {
            throw new Error.NotFoundError("User does not exist");
        }

        let response = {
            name: result[0].name,
            city: result[0].city,
            country: result[0].country
        };

        // check if tokens match
        if (result[0].auth_token != null && result[0].auth_token == token) {
            response.email = result[0].email;
        }
        // if (token != null) {
        //     query = 'select email from User where user_id = ? and auth_token = ?';
        //     [result] = await connection.query(query, [user_id, token]);
        //
        // }
        return response;
    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }

};

function editName(user, data) {
    if (data.hasOwnProperty("name")) {
        AttChecker.checkString(data.name, "name", true);
        return data.name;
    } else {
        return user.name;
    }
}

function editEmail(user, data) {
    if (data.hasOwnProperty("email")) {
        AttChecker.checkEmail(data.email);
        return data.email;
    } else {
        return user.email;
    }
}

async function editPassword(user, data) {
    if (data.hasOwnProperty("password")) {

        if (!data.hasOwnProperty("currentPassword")) {
            throw new Error.BadRequestError("Need to provide current password");
        }
        AttChecker.checkPassword(data.currentPassword);

        if (!await checkPassword(data.currentPassword, user.password)) {
            // if (data.currentPassword !== user.password) {
            throw new Error.BadRequestError("Current password not matching or null");
            // }
        } else {
            AttChecker.checkString(data.password, "password", true);
            return hashPassword(data.password);
        }
    } else {
        return user.password;
    }
}

function editCity(user, data) {
    if (data.hasOwnProperty("city")) {
        AttChecker.checkString(data.city, "city", true);
        return data.city;
    } else {
        return user.city;
    }
}

function editCountry(user, data) {
    if (data.hasOwnProperty("country")) {
        AttChecker.checkString(data.country, "country", true);
        return data.country;
    } else {
        return user.country;
    }
}

async function createEditedUser(original_user, data) {
    try {
        return {
            name: editName(original_user, data),
            email: editEmail(original_user, data),
            password: await editPassword(original_user, data),
            city: editCity(original_user, data),
            country: editCountry(original_user, data)
        }
    } catch (err) {
        throw err;
    }
}

function isSameUser(original_user, edited_User) {




    return original_user.name === edited_User.name &&
        original_user.email === edited_User.email &&
        original_user.password === edited_User.password &&
        original_user.city === edited_User.city &&
        original_user.country === edited_User.country;
}

function hasChanges(changes) {
    if (changes.hasOwnProperty("name") || changes.hasOwnProperty("email") || changes.hasOwnProperty("password") || changes.hasOwnProperty("city") || changes.hasOwnProperty("country")) {
        return true;
    };
    return false;

}

exports.edit = async function (user_id, token, data) {
    console.log(`Request to edit user ${user_id}~`);
    const connection = await db.getPool().getConnection();
    let query;
    try {
        let original_user;

        // Check authentication
        if (token == null) {
            throw new Error.UnauthorizedError("Token is null");
        } else {

            // Check that user with token matches actual user
            query = 'select user_id from User where auth_token = ?';
            let [result] = await connection.query(query, [token]);
            if (result[0] == null) {
                throw new Error.UnauthorizedError(`User with given token does not exist`);
            }

            query = 'select name, email, password, city, country from User where user_id = ?';
            let [users] = await connection.query(query, [user_id]);
            if (users[0] == null) {
                throw new Error.BadRequestError(`No user exists with ID ${user_id}`);
            }

            if (user_id != result[0].user_id) {
                throw new Error.ForbiddenError(`User ${user_id} cannot edit user ${result[0].user_id}`);
            }
            original_user = users[0];
        }


        let edited_user = await createEditedUser(original_user, data);

        if (hasChanges(data)) {
           query = 'update User set name = COALESCE(?,name), email = COALESCE(?,email), city = ?, country = ?, password = COALESCE(?, password) where user_id = ? and auth_token = ?';
            let [result] = await connection.query(query, [
                edited_user.name,
                edited_user.email,
                edited_user.city,
                edited_user.country,
                edited_user.password,
                user_id, token]);
            return result;
        } else {
            throw new Error.BadRequestError("No changes given")
        }


    } catch (err) {
        if (err instanceof Error.BadRequestError ||
            err instanceof Error.UnauthorizedError ||
            err instanceof Error.ForbiddenError) {
            throw err;
        } else {
            throw new Error.BadRequestError(err);
        }
    } finally {
        connection.release();
    }
};

function getFileType(filename) {
    let index = filename.lastIndexOf('.');
    let type =  (index < 0) ? '' : filename.substr(index + 1);
    return type;
}

exports.getPhoto = async function (userId) {
    console.log(`Request to get user photo of ${userId}`);

    let connection = await db.getPool().getConnection();

    try {
        let query = 'select photo_filename from User where user_id = ?';
        let [result] = await connection.query(query, [userId]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`User with user ID ${userId} does not exist`);
        }
        let filename = result[0].photo_filename;
        if (filename == null) {
            throw new Error.NotFoundError("No photo");
        }
        let storagePath = '.\\storage\\photos';
        let path = `${storagePath}\\${filename}`;

        console.log("PATH:", path);

        let data = fs.readFileSync(path, (err, data) =>  {
            if (err) throw err;
            return data;
        });
        let type = getFileType(filename);
        let contentType = 'image/';
        if (type === "jpg") {
            type = "jpeg";
        }
        contentType += type;

        return [data, contentType];


    } catch (err) {
        throw err
    } finally {
        connection.release();
    }

};

exports.setPhoto = async function (user_id, token, body, type) {
    console.log(`Request to set the photo of user ${user_id}`);

    let connection = await db.getPool().getConnection();

    // Validation of user
    if (token == null) {
        throw new Error.UnauthorizedError("Token is null");
    }

    try {
        let query;


        // Check that user with token matches actual user
        query = 'select user_id, photo_filename from User where auth_token = ?';
        let [result] = await connection.query(query, [token]);
        if (result[0] == null) {
            throw new Error.UnauthorizedError(`User with given token does not exist`);
        }

        let currentUser = result[0].user_id;
        let currentPhoto = result[0].photo_filename;


        // Check that the user exists
        query = 'select user_id from User where user_id = ?';
        [result] = await connection.query(query, [user_id]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`User ${user_id} not found.`);
        }

        if (user_id != currentUser) {
            throw new Error.ForbiddenError(`User ${currentUser} cannot set the photo for user ${user_id}`);
        }


        let status = 200;
        if (currentPhoto == null) {
            status = 201;
        }

        let storagePath = '.\\storage\\photos';
        let fileType;
        if (type === 'image/png') {
            fileType = 'png';
        } else if (type === 'image/jpeg') {
            fileType = 'jpg';
        } else if (type === 'image/gif') {
            fileType = 'gif'
        } else {
            throw new Error.BadRequestError(`File type ${type} is not a valid file type`)
        }
        let fileName = `user_${user_id}`;
        let filePath = `${storagePath}\\${fileName}.${fileType}`;


        fs.writeFileSync(filePath, body, 'binary', function (err) {
            if (err) throw err;
        });

        query = 'update User set photo_filename = ? where user_id = ?';
        [result] = await connection.query(query, [`${fileName}.${fileType}`, user_id]);

        return status;

    }  catch (err) {
        throw err;
    } finally {
        connection.release();
    }
};

exports.deletePhoto = async function (userId, token) {
    console.log(`Request to delete the photo of user ${userId}`);

    // Check if token is null
    if (token == null) {
        throw new Error.UnauthorizedError("Token is null");
    }

    let connection = await db.getPool().getConnection();

    try {
        let query;


        // Get the user id and photo name of person with auth token
        query = 'select user_id, photo_filename from User where auth_token = ?';
        let [result] = await connection.query(query, [token]);
        if (result[0] == null) {
            throw new Error.UnauthorizedError(`User with given token does not exist`);
        }

        let currentUser = result[0].user_id;

        let photo = result[0].photo_filename;
        // Check that the user exists
        query = 'select user_id from User where user_id = ?';
        [result] = await connection.query(query, [userId]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`User ${userId} not found.`);
        }


        // Check if token matches user
        console.log("???", userId, result[0].user_id);
        if (userId != currentUser) {
            throw new Error.ForbiddenError(`User ${currentUser} cannot delete the photo for user ${result[0].user_id}`);
        }

        // check if photo is null
        if (photo == null) {
            throw new Error.ForbiddenError("No photo for this user") // TODO: CHeck this is the right error
        }


        // set the photo_filename of user with userId to null
        query = 'update User set photo_filename = ? where user_id = ?';
        [result] = await connection.query(query, [null, userId]);
        return result;

    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }

};
'use strict'

// external dependencies
require("mongodb-toolkit");
const ObjectId = require("mongodb").ObjectId;
const BaseManager = require("module-toolkit").BaseManager;
const BateeqModels = require('bateeq-models');

// internal dependencies
const map = BateeqModels.map;
const generateCode = require("../../utils/code-generator");
const DesignTrackingBoard = BateeqModels.manufacture.DesignTrackingBoard;
const moduleId = "EFR-DTB";

module.exports = class DesignTrackingBoardManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.manufacture.DesignTrackingBoard);
    }

    _getQuery(paging) {
        let _default = {
            _deleted: false
        },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            let regex = new RegExp(paging.keyword, "i");
            let nameFilter = {
                "name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode(moduleId);
        return Promise.resolve(data);
    }

    _validate(designTrackingBoard) {
        let errors = {};
        let valid = designTrackingBoard;

        if (!valid.name || valid.name === "")
            errors['name'] = 'Name is required';

        if (!valid.numberOfStage || valid.numberOfStage === "")
            errors['numberOfStage'] = 'Number of stage is required';
        else if (valid.numberOfStage < 1)
            errors['numberOfStage'] = 'Number of stage must be greater or equal than 1';
        else if (valid.numberOfStage > 7)
            errors['numberOfStage'] = 'Number of stage must be lesser or equal than 7';
        else if (valid.stagesLength > valid.numberOfStage)
            errors['numberOfStage'] = 'Jumlah stage pada board ini melebihi banyak stage yang anda input, Silahkan hapus stage yang diinginkan terlebih dahulu.';

        if (Object.getOwnPropertyNames(errors).length > 0) {
            let ValidationError = require('module-toolkit').ValidationError;
            return Promise.reject(new ValidationError('data does not pass validation', errors));
        }

        if (!valid.stamp) {
            delete valid.stagesLength;
            valid = new DesignTrackingBoard(valid);
        }

        valid.stamp(this.user.username, "manager");
        return Promise.resolve(valid);
    }

    _createIndexes() {
        let dateIndex = {
            name: `ix_${map.manufacture.DesignTrackingBoard}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        let deletedIndex = {
            name: `ix_${map.manufacture.DesignTrackingBoard}__deleted`,
            key: {
                _deleted: 1
            }
        };

        return this.collection.createIndexes([dateIndex, deletedIndex]);
    }

    read(paging) {
        let _paging = Object.assign({
            select: ["name"],
            order: { "_createdDate": "asc" }
        }, paging);

        return this._createIndexes()
            .then((createIndexResults) => {
                let query = this._getQuery(_paging);
                return this.collection
                    .where(query)
                    .select(_paging.select)
                    .order(_paging.order)
                    .execute();
            });
    }
};
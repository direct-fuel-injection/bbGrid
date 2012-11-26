bbGrid v0.1b
====================

That's an extendable grid system (jqGrid like) developed on Backbone.js, Twitter Bootstrap and jQuery frameworks.


Quick Start
---------------------

### Requirements
- Backbone.js v0.9.2
- Twitter Bootstrap v2.2.1
- jQuery v1.8.3

### Usage

Include bbGrid.js and bbGrid.css into your project. Use it!

### Example
    
    //create your own model
    App.pimModel = Backbone.Model.extend({
    });
    //create your own collection
    App.pimsCollection = Backbone.Collection.extend({
        url: 'ajax?type=getbanks&clear=1',
        model: App.pimModel
    });

    App.banks = new App.banksCollection();
    
    //create your bbGrid
    var banksView = new bbGrid.View({
        caption: 'Bank list',
        container: $('#banks'),
        width: 800,
        collection: App.banks,
        rows: 25,
        colNames: ['Id', 'Bank Name'],
        colModel: [
            {name: 'id', sorttype: 'number'},
            {name: 'bankname'}
        ],
        multiselect: true,
        subgrid: true,
        buttons: {
            'Add new bank': function(){
            },
            'Bank content': function(){
                
            }
        }
    });

> ## Thanks for using it!

[bbGrid](http://direct-fuel-injection.github.com/bbGrid/)
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
[Demonstration of bbGrid on 10000 rows](http://direct-fuel-injection.github.com/bbGrid/)

    var banksView = new bbGrid.View({        
        container: $('#banks'),
        width: 800,
        collection: YourCollectionHere,
        rows: 25,       
        colModel: [
            {title: 'ID', name: 'id', sorttype: 'number'},
            {title: 'Bank Name', name: 'bankname'}
        ],
        autofetch: true,
        multiselect: true,
        subgrid: false,
        buttons: {
            'Add new bank': function(){ /* your code here */ }            
        }
    });

> ## Thanks for using it!
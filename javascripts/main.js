$(function() {
    var App = {};

    App._exampleCollection = Backbone.Collection.extend({
        url: 'examples.json'
    });

    App.companies = new Backbone.Collection;
    App.clearGridCollection = new Backbone.Collection;
    App.exampleCollection = new App._exampleCollection();
    // filters example
    App.FiltersExampleGrid = new bbGrid.View({
        container: $('#bbGrid-filters'),
        rows: 5,
        rowList: [5, 25, 50, 100],
        collection: App.exampleCollection,
        colModel: [{
            title: 'ID',
            name: 'id',
            index: true,
            sorttype: 'number'
        }, {
            title: 'Full Name',
            index: true,
            name: 'name',
            filter: true,
            filterType: 'input'
        }, {
            title: 'Company',
            index: true,
            name: 'company',
            filter: true
        }, {
            title: 'Email',
            index: true,
            name: 'email'
        }]
    });

    App.SearchExampleGrid = new bbGrid.View({
        container: $('#bbGrid-search'),
        rows: 5,
        rowList: [5, 25, 50, 100],
        collection: App.exampleCollection,
        colModel: [{
            title: 'ID',
            name: 'id',
            index: true,
            sorttype: 'number'
        }, {
            title: 'Full Name',
            index: true,
            name: 'name'
        }, {
            title: 'Company',
            index: true,
            name: 'company'
        }, {
            title: 'Email',
            index: true,
            name: 'email'
        }],
        enableSearch: true,
        onReady: function() {
            $('a', this.$el).removeAttr('href');
        }
    });

    App.exampleCollection.fetch({
        wait: true,
        success: function(collection) {
            App.ClearExampleGrid = new bbGrid.View({
                container: $('#bbGrid-clear'),
                collection: App.clearGridCollection,
                colModel: [{
                    title: 'ID',
                    name: 'id'
                }, {
                    title: 'Full Name',
                    name: 'name'
                }, {
                    title: 'Company',
                    name: 'company'
                }, {
                    title: 'Email',
                    name: 'email'
                }]
            });
            App.ButtonsExampleGrid = new bbGrid.View({
                container: $('#bbGrid-buttons'),
                collection: App.clearGridCollection,
                colModel: [{
                    title: 'ID',
                    name: 'id'
                }, {
                    title: 'Full Name',
                    name: 'name'
                }, {
                    title: 'Company',
                    name: 'company'
                }, {
                    title: 'Email',
                    name: 'email'
                }],
                buttons: [{
                    title: 'Show selected',
                    onClick: function() {
                        var models = this.getSelectedModels();
                        if (!_.isEmpty(models))
                            alert(_.first(models).get('name'));
                        else
                            alert('Nothing');

                    }
                }]
            });
            App.clearGridCollection.reset(collection.models.slice(0, 10));

            App.SubgridExapmleGrid = new bbGrid.View({
                container: $('#bbGrid-subgrid'),
                rows: 5,
                rowList: [25, 50, 100],
                collection: App.companies,
                subgrid: true,
                subgridAccordion: true,
                colModel: [{
                    title: 'Company',
                    index: true,
                    name: 'company'
                }],
                onRowExpanded: function($el, rowid) {
                    var subgridCollection = new Backbone.Collection();
                    var subgrid = new bbGrid.View({
                        container: $el,
                        rows: 10,
                        //                        multiselect: true,
                        collection: subgridCollection,
                        colModel: [{
                            title: 'Full Name',
                            index: true,
                            name: 'name'
                        }, {
                            title: 'Age',
                            name: 'age',
                            index: true,
                            sorttype: 'number'
                        }, {
                            title: 'Address',
                            index: true,
                            name: 'address'
                        }, {
                            title: 'Email',
                            index: true,
                            name: 'email'
                        }]
                    });
                    subgridCollection.reset(collection.where({
                        'company': App.companies.at(rowid).get('company')
                    }));
                }
            });
            App.companies.reset(_.map(_.uniq(collection.pluck('company')), function(val, index) {
                return {
                    'id': index,
                    'company': val
                };
            }));
        }
    });

    //    
    //    $.getJSON("examples.json", function(json) {
    //        models = json.result;
    //        MyCollection.add(models, {silent: true});
    //        MyCollection.trigger('reset');
    //        companies.trigger('reset');
    //    });

});

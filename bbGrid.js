//     bbGrid.js 0.5.1

//     (c) 2012-2013 Minin Alexey, direct-fuel-injection.
//     bbGrid may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://direct-fuel-injection.github.com/bbGrid/

var bbGrid = {};

bbGrid.View = function(options) {
    _.extend(this, options);
    Backbone.View.apply(this, [options]);

    _.bindAll(this, 'numberComparator', 'stringComparator');
    var self = this;
    this.rowViews = {};
    this.selectedRows = [];
    this.currPage = 1;
    
    if(!this.collection){
        throw('bbGrid: collection param is undefined');
    }
    
    this.collection.view = this;

    var nonWrapped = _.bind(this.collection.fetch, this.collection);
    this.collection.fetch = (function() {
        return function(options) {
            options || (options = {});
            if(!options.silent)
                self.trigger('fetch');
            return nonWrapped(options);
        };
    })();

    this.enableFilter = _.compact(_.pluck(this.colModel, 'filter')).length > 0;
    this.autofetch = !this.loadDynamic && this.autofetch;
    this.render();
    if(this.autofetch){
        this.toggleLoading(true);
        this.collection.fetch({ silent: true,    
            success: function(){
                self.renderPage({ silent: true });
            }
        });
        this.autofetch = false;
    }
    
    if(this.loadDynamic){        
        _.extend(this.collection.prototype, {
              parse: function(response) {
                this.view.cntPages = response.total;
                return response.rows;
              }
        });
    }
    
    this.on('selected', (this.subgrid) ? this.toggleSubgridRow : this.resetSelection);
    this.on('pageChanged', this.onPageChanged);
    this.on('sort', this.onSort);
    this.on('checkall', this.onCheckAll);
    this.on('rowDblClick', this.onDblClick);
    this.on('fetch', this.toggleLoading, this);
    this.on('filter', function(){ this.renderPage({silent: true}) }, this);
    this.collection.on("all", this.collectionEventHandler, this);
};

_.extend(bbGrid.View.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-container container',
    collectionEventHandler: function(eventName, model, collection, options) {
        switch(eventName) {
        case 'reset':
            this.renderPage();
            break;
        case 'add':
            this.rowsHandler(model, collection, options);
            break;
        default:
            return true;
        }        
    },
    render: function(){
        if(this.width) this.$el.css('width', this.width);
        
        if(!this.$grid){
            this.$grid = $('<table class="bbGrid-grid table table-bordered table-condensed" />');
            if(this.caption)
                this.$grid.append('<caption>'+this.caption+'</caption>');
            this.$grid.appendTo(this.el);
        }
        if(!this.$thead){
            this.thead = new bbGrid.TheadView({view: this});
            this.$thead = this.thead.render();
            this.$grid.append(this.$thead);
        }        
        if(!this.$navBar){
            this.navBar = new bbGrid.NavView({view: this});
            this.$navBar = this.navBar.render();
            this.$grid.after(this.$navBar);
            this.$loading = $('<div class="bbGrid-loading progress progress-info progress-striped active"><div class="bar bbGrid-loading-progress">Загрузка...</div></div>');
            this.$navBar.prepend(this.$loading);
        }
        if(!this.$searchBar && this.enableSearch){
            this.searchBar = new bbGrid.SearchView({view: this});
            this.$searchBar = this.searchBar.render();
            this.$navBar.append(this.$searchBar);
//            this.$grid.before(this.$topbar);
        }
        $(this.container).append(this.$el);
        
        this.renderPage();        
        return this;
    },
    setCollection: function(collection){
        this.collection = collection || new Backbone.Collection();
        this.collection.on('all', this.collectionEventHandler, this);
    },
    numberComparator: function(model) {
        return model.get(this.sortName);
    },
    stringComparator: function(model){
        return model.get(this.sortName).toLowerCase();
    },
    rsortBy: function(col){        
        var isSort = (this.sortName && this.sortName == col.name) ? false: true;
        this.sortName = col.name;
        var sortType = (col.sorttype)? col.sorttype : 'string';
        this.sortOrder = (this.sortOrder == 'asc') ? 'desc' : 'asc';
        var boundComparator;
        switch(sortType){
            case 'string':
                boundComparator = _.bind(this.stringComparator, this.collection);
                break;
            case 'number':
                boundComparator = _.bind(this.numberComparator, this.collection);
                break;
            default:
                boundComparator = _.bind(this.stringComparator, this.collection);
        }
        this.collection.models = (isSort) ? this.collection.sortBy(boundComparator) : this.collection.models.reverse();
    },
    getIntervalByPage: function (page){
        var interval = {};
        if(this.rows){
            interval.s = (page - 1) * this.rows;
            interval.e = page * this.rows;
            if( interval.e > this.collection.length)
                interval.e = this.collection.length || this.rows;
        }
        else
            interval = {s:0, e:this.collection.length};
        return interval;
    },
    clearGrid: function(){
        for(key in this.rowViews) this.rowViews[key].remove();
        this.rowViews = {};
        $('tbody', this.$el).empty();
    },
    toggleLoading: function(isToToggle){
        if(isToToggle == undefined) isToToggle = true;
        this.$navBar.show();
        if(this.$buttonsContainer) this.$buttonsContainer.toggle(!isToToggle);
        if(this.$pager) this.$pager.toggle(!isToToggle);
        if(this.$searchBar) this.$searchBar.toggle(!isToToggle);
        this.$loading.toggle(isToToggle);
        if(!this.rows && !this.buttons && !isToToggle) this.$navBar.hide();
    },
    showCollection: function(collection){
        var self = this;
        this.clearGrid();
         _.each( collection, function(model) {
            self.renderRow(model);
        });
        if(collection.length == 0 && !this.autofetch){
            var colspan = (this.multiselect || this.subgrid) ? this.colModel.length+1 : this.colModel.length;
            this.$grid.append('<tbody><tr class="bbGrid-noRows"><td colspan="'+colspan+'">Нет записей</td></tr></tbody>');
        }
    },
    setRowSelected: function(options){
    },
    toggleSubgridRow: function(model, $el, options){
        options = options || {};
        var View = (this.subgridAccordion) ? this : this.rowViews[model.id];
        if(this.subgridAccordion)
            $('tr', this.$el).removeClass('warning');
        if(View.$subgridContainer){
            $('td.bbGrid-subgrid-control i', View.$subgridContainer.prev()).removeClass('icon-minus');

            if(options.isShown)
                View.$subgridContainer.html('');
            else {
                View.$subgridContainer.remove();
                delete View.$subgridContainer;
            }
            
            if (View.expandedRowId == model.id && !options.isShown){
                if(this.onRowCollapsed)
                    this.onRowCollapsed($('td',View.$subgridContainer)[1], model.id);
                return false;
            }
        }

        $('td.bbGrid-subgrid-control i', $el).addClass('icon-minus');
        var colspan = (this.multiselect) ? 2 : 1;
        var subgridRow = _.template('<tr class="bbGrid-subgrid-row"><td colspan="<%=extra%>"/><td colspan="<%=colspan %>"></td></tr>');
        var subgridContainerHtml = subgridRow({extra: colspan, colspan: this.colModel.length});

        View.$subgridContainer = $(subgridContainerHtml);
        $el.after(View.$subgridContainer);
        
        View.expandedRowId = model.id;
        if(this.onRowExpanded)
            this.onRowExpanded($('td',View.$subgridContainer)[1], model.id);
    },
    onCheckAll: function(event){
        var checked = $(event.target).is(':checked');
        for (key in this.rowViews){
            if(this.rowViews[key].selected != checked){
                if(!this.rowViews[key].model.get('cb_disabled'))
                    this.rowViews[key].trigger('select');
            }
        }
    },
    rowsHandler: function(model, collection, options){
        if((options && collection.length == options.index+1) || options == undefined)
            this.renderPage();
    },
    renderRow: function(model){
        if(this.rows == _.size(this.rowViews))
            return false;
        this.rowViews[model.id] = new bbGrid.RowView({model: model, view: this});
        this.$grid.append(this.rowViews[model.id].render().el);
    },
    renderPage: function(options){
        options = options || {silent: false};
        var self = this;
        if(this.loadDynamic && !this.autofetch && !options.silent){
            this.collection.fetch({
                data: { page: self.currPage, rows: this.rows},
                wait: true, silent: true,
                success: function(){
                    self.renderPage({ silent: true, interval: {s: 0, e: self.rows} });
                }
            });
            return false;
        }
        
        this.selectedRows = [];
        
        if(this.onBeforeRender) this.onBeforeRender();
        if(!options.silent)
            this.thead.render();
        if(this.rows && this.pager) this.pager.render();
        var interval = options.interval || this.getIntervalByPage(this.currPage);
        
        this.showCollection(this.collection.models.slice(interval.s, interval.e));
        this.toggleLoading(false);
        if(this.onReady && !this.autofetch)
            this.onReady();
        if(this.filterBar && !options.silent)
            this.filterBar.render();
    },
    onSort: function(event){
        var $el = $(event.currentTarget);        
        var col = _.find(this.colModel, function(col){return col.title == $el.text();});
        
        if(!col || (col && ( col.name == 'bbGrid-actions-cell' || !col.index)))
            return false;
        $('thead th i', this.$el).removeClass();
        this.rsortBy(col);
        
        if(this.sortOrder == 'asc')
            $('i', $el).addClass('icon-chevron-up');
        else
            $('i', $el).addClass('icon-chevron-down');

        this.renderPage({silent: true});
    },
    onDblClick: function(model, $el){
        if(this.onRowDblClick)
            this.onRowDblClick(model);
    },
    onPageChanged: function(event){
        var $el = $(event.currentTarget)
        var className = $el.attr('class');

        switch(className){
            case 'bbGrid-page-input':
                page = parseInt($el.val());
                break;
            case 'left':
                page = this.currPage - 1;
                break;
            case 'right':
                page = this.currPage + 1;
                break;
            case 'first':
                page = 1;
                break;
            case 'last':
                page = this.cntPages;
                break;
            default:
                page = this.currPage;
        }
        
        if (page > this.cntPages || page <= 0)
            return false;
        
        if(this.currPage != page){
            this.currPage = page;            
                
            $('div.bbGrid-pager li', this.$el).removeClass('active');
            $('.bbGrid-page-input', this.$pager).val(this.currPage);

            if(this.currPage == 1)
                $('div.bbGrid-pager a.left,.first', this.$el).parent().addClass('active');
            if(this.currPage >= this.cntPages)
                $('div.bbGrid-pager a.right,.last', this.$el).parent().addClass('active');
            
            this.renderPage({silent: !this.loadDynamic});
        }
    },
    resetSelection: function(model){
        if(!this.multiselect) $('tr', this.$el).removeClass('warning');
    },
    getSelectedModels: function(){
        var self = this;
        return _.map(this.selectedRows, function(id){return self.collection.get(id)});
    }
});

bbGrid.View.extend = Backbone.View.extend;

/* View of Model */
bbGrid.RowView = function(options){
    this.events = {
        "click td[class!=bbGrid-actions-cell]": "setSelection",
        "dblclick td[class!=bbGrid-actions-cell]": "onDblClick"
//        "click input[type=checkbox]": "setSelection"
    };
    Backbone.View.apply(this, [options]);

    this.view = options.view;
    this.on('select', this.setSelection);
    this.model.on('remove', this.modelRemoved, this);
    this.model.on('change', this.modelChanged, this);
};

_.extend(bbGrid.RowView.prototype, Backbone.View.prototype, {
    tagName: 'tr',
    className: 'bbGrid-row',
    modelRemoved: function(model, collection, options){
        var self = this;
        this.view.selectedRows = _.reject(this.view.selectedRows,
            function(rowId){return rowId == self.model.id;}
        );
        this.remove();
    },
    remove: function(){
        this.model.off();
        this.$el.remove();
        return this;
    },
    modelChanged: function(){
        this.render();
        if(this.view.onReady && !this.view.autofetch)
            this.view.onReady();
    },
    onDblClick: function(event){
        this.view.trigger("rowDblClick", this.model, this.$el);
    },
    setSelection: function(options){
        options = options || {};
        var target = options.currentTarget || undefined,
            className = (target) ? target.className : undefined,
            self = this,
            $control = $(target).closest('tr').find('td.bbGrid-multiselect-control input');
        if($control && $control.is(':disabled') && className != 'bbGrid-subgrid-control') return false;
        if(!(this.view.multiselect && this.view.subgrid && className != 'bbGrid-subgrid-control')) {
            this.view.trigger("selected", this.model, this.$el, options);
        }        
        if(this.view.multiselect && className == 'bbGrid-subgrid-control') {
            return false;
        }
        
        this.$el.addClass('warning');
        
        if(this.view.multiselect || this.view.subgrid) {
            this.selected = (this.selected) ? false : true;
            $('input[type=checkbox]', this.$el).prop('checked', this.selected);
            this.selected = options.isShown || this.selected;
            if(!this.selected && !options.isShown) {
                this.$el.removeClass('warning');
            }
        } else {
            this.selected = true;
        }

        if(this.selected || options.isShown) {
            if(this.view.multiselect || (this.view.subgrid && !this.view.subgridAccordion)) {
                this.view.selectedRows.push(this.model.id);
            } else {
                if(this.view.selectedRows.length > 0 && this.view.rowViews.hasOwnProperty(this.view.selectedRows[0])){
                    this.view.rowViews[this.view.selectedRows[0]].selected = false;
                }
                this.view.selectedRows = [this.model.id];
            }
        } else {
            this.view.selectedRows = _.reject(this.view.selectedRows,
                function(rowId){
                    return rowId == self.model.id;
            });
        }

        if(this.view.onRowClick)
            this.view.onRowClick(this.model);
    },
    render: function(){
        var self = this;
        var row = _.template('<% if(isMultiselect){%>\
            <td class="bbGrid-multiselect-control"><input type="checkbox" <% if(isDisabled){ %>disabled="disabled"<% } %><% if(isChecked){%>checked="checked"<%}%>></td>\
            <%} if(isContainSubgrid){%>\
                <td class="bbGrid-subgrid-control">\
                    <i class="icon-plus<%if(isSelected){%> icon-minus<%}%>">\
                </td>\
                <%} _.each(values, function(row){%>\
                    <td <% if(row.name == "bbGrid-actions-cell") {%>class="bbGrid-actions-cell"<%}%>>\
                        <%=row.value%>\
                    </td>\
                <%})%>');
        var cols = _.filter(this.view.colModel, function(col){return !col.hidden;});        
        var isChecked = ($.inArray(this.model.id, this.view.selectedRows) >= 0);
        var isDisabled = false || this.model.get('cb_disabled');
        var html = row( {
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            isSelected: false || this.selected,
            isChecked: isChecked,
            isDisabled: isDisabled,
            values: _.map(cols, function(col){
                if(col.actions) {
                   col.name = 'bbGrid-actions-cell';
                   col.value = col.actions(self.model.id, self.model.attributes);
                }
                else
                    col.value = self.model.attributes[col.name];
                return col;
            })});
        if(isChecked) {
            this.selected = true;
            this.$el.addClass('warning');
        }
        this.$el.html(html);
        return this;
    }
});

bbGrid.RowView.extend = Backbone.View.extend;

/* View of div pagination */
bbGrid.PagerView = function(options){
    this.events =  {
        'click a': 'onPageChanged',
//        'click i': 'onPageChanged',
        'change .bbGrid-pager-rowlist': 'onRowsChanged',
        'change .bbGrid-page-input': 'onPageChanged'
    };

    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.PagerView.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-pager-container span offset',
    onRowsChanged: function(event){
      this.view.rows = $(event.target).val();
      this.render();
      this.view.render();
    },
    onPageChanged: function(event){
        this.view.trigger('pageChanged', event);
    },
    initPager: function() {
        if(!this.view.loadDynamic)
            this.view.cntPages = Math.ceil(this.view.collection.length / this.view.rows);
        if(this.view.currPage > 1 && this.view.currPage > this.view.cntPages)
            this.view.currPage = this.view.cntPages;
       
        var pager = _.template('<div class="span bbGrid-pager">\
            <ul class="nav nav-pills">\
                <li<%if(page == 1){%> class="active"<%}%>>\
                    <a class="first"><i class="icon-step-backward"/></a>\
                </li>\
                <li <%if(page == 1){%> class="active"<%}%>>\
                    <a class="left"><i class="icon-backward"/></a>\
                </li>\
                <li>\
                    <div class="bbGrid-page-counter pull-left">Стр.</div>\
                    <input class="bbGrid-page-input" value="<%=page%>" type="text">\
                    <div class="bbGrid-page-counter pull-right"> из <%=cntpages%> </div>\
                </li>\
                <li<%if(page == cntpages){%> class="active"<%}%>>\
                    <a class="right"><i class="icon-forward"/></a>\
                </li>\
                <li<%if(page == cntpages){%> class="active"<%}%>>\
                    <a class="last"><i class="icon-step-forward"/></a>\
                </li>\
            </ul>\
            </div>\
            <% if(rowlist){%>\
                <div class="bbGrid-pager-rowlist-label pull-left">Cтрок на странице:</div>\
                <select class="bbGrid-pager-rowlist">\
                    <% _.each(rowlist, function(val){%>\
                        <option <% if(rows == val){%>selected="selected"<%}%>><%=val%></option>\
                    <%})%>\
                </select>\
            <%}%>');
        var pagerHtml = pager({page: this.view.currPage, cntpages: this.view.cntPages, rows: this.view.rows, rowlist: (this.view.rowList) ? this.view.rowList : false});
        if(!this.view.rowList)
            this.$el.addClass('bbGrid-pager-container-norowslist');
        this.$el.html(pagerHtml);
    },
    render: function(){
        this.initPager();
        return this.$el;
    }
});

bbGrid.PagerView.extend = Backbone.View.extend;

/* View of thead */
bbGrid.TheadView = function(options){
    this.events =  {
        'click th': 'onSort',
        'click input[type=checkbox]': 'onAllCheckbox'
    };

    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.TheadView.prototype, Backbone.View.prototype, {
    tagName: 'thead',
    className: 'bbGrid-grid-head',
    onAllCheckbox: function(event){
        this.view.trigger('checkall', event);
    },
    onSort: function(event){        
        this.view.trigger('sort', event);
    },
    render: function(){
        if(!this.$headHolder){
            this.$headHolder = $('<tr class="bbGrid-grid-head-holder"/>');
            this.$el.append(this.$headHolder);
        }
        var row = _.template('<% if(isMultiselect){%>\
                <th style="width:15px">\
                    <input type="checkbox">\
                </th>\
            <%} if(isContainSubgrid){%>\
                <th style="width:15px"/>\
                <%} _.each(values, function(value){%>\
                    <th><%=value%><i /></th>\
                <%})%>');
        var cols = _.filter(this.view.colModel, function(col){return !col.hidden;});        
        var theadHtml = row({
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            values: _.map(cols, function(col){return (col.title) ? col.title : col.name;})
        });
        this.$headHolder.html(theadHtml);
        if(!this.view.$filterBar && this.view.enableFilter){
            this.view.filterBar = new bbGrid.FilterView({view: this.view});
            this.view.$filterBar = this.view.filterBar.render();
            this.$el.append(this.view.$filterBar);
        }
        
        return this.$el;
    }
});

bbGrid.TheadView.extend = Backbone.View.extend;

/* View of NavBar */
bbGrid.NavView = function(options){
    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.NavView.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-grid-nav row',
    render: function() {
        if(this.view.buttons){
            var self = this;
            var $button;
            this.view.$buttonsContainer = $('<div class="bbGrid-navBar-buttonsContainer btn-group span"/>');
            
            this.view.buttons = _.map(this.view.buttons, function(button){
                if(!button)
                    return undefined;
                var btn = _.template('<button <%if(id){%>id="<%=id%>"<%}%> class="btn btn-mini" type="button"><%=title%></button>');
                var btnHtml = btn({id: button.id, title: button.title});
                $button = $(btnHtml).appendTo(self.view.$buttonsContainer);
                if (button.onClick){
                    button.onClick = _.bind(button.onClick, self.view.collection);
                    $button.click(button.onClick);
                }
                return $button;
            });
            this.$el.append(this.view.$buttonsContainer);
        }
        if(!this.view.$pager && this.view.rows){
            this.view.pager = new bbGrid.PagerView({view: this.view});
            this.view.$pager = this.view.pager.render();
            this.view.$pager.appendTo(this.$el);
        }
        
        return this.$el;
    }
});

bbGrid.NavView.extend = Backbone.View.extend;

/* View of SearchBar */
bbGrid.SearchView = function(options){
    this.events = {
        'keyup input[name=search]': 'onSearch',
        'click li > a': 'setSearchOption'
    };
    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.SearchView.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-search-bar pull-right',
    initialize: function(options){
        _.bindAll(this, 'setSearchOption');
        options.view._collection = options.view.collection;
        this.searchOptionIndex = this.searchOptionIndex || 0;
    },
    onSearch: function(event){
        var self = this,
            $el = $(event.target),
            text = $el.val(),
            pattern = new RegExp(text,"gi");
        
        this.view.collection = this.view._collection;

        if (text){
            this.view.setCollection(new this.view._collection.constructor(this.view.collection.filter(function(data) {
                return pattern.test(data.get(self.view.colModel[self.searchOptionIndex].name));
            })));
        }
        this.view.collection.trigger('reset');
    },
    setSearchOption: function(event){
        var el = event.currentTarget;
        $('a[name='+this.searchOptionIndex+']', this.$el).parent().removeClass('active');
        $(el).parent().addClass('active');
        this.searchOptionIndex = Number(el.name);
        $('button span[name=column]',this.$el).text(el.text);
    },
    render: function(){
        var searchBar = _.template(
            '<div class="input-append">\
                <input name="search" class="span2" type="text" placeholder="Поиск">\
                <div class="btn-group dropup">\
                    <button class="btn dropdown-toggle" data-toggle="dropdown">\
                    <span name="column"><%=cols[0].title%></span>\
                    <span class="caret"></span>\
                    </button>\
                    <ul class="dropdown-menu pull-right">\
                        <% _.each(cols, function(col, index){%>\
                            <li <% if(index == searchOptionIndex){ %>class="active"<% } %>><a name="<%=index%>" href="#"><%=col.title%></a></li>\
                        <%})%>\
                    </ul>\
                </div>\
            </div>'),
            searchBarHtml = searchBar({
                searchOptionIndex: this.searchOptionIndex,
                cols: _.filter(this.view.colModel, function(col){
                    return col.name && !col.hidden;
                })
            });
        this.$el.html(searchBarHtml);
        return this.$el;
    }
});

bbGrid.SearchView.extend = Backbone.View.extend;

bbGrid.FilterView = function(options){
    this.events = {
        'keyup input[name=filter]': 'onFilter',
        'change select[name=filter]': 'onFilter'
    };
    Backbone.View.apply(this, [options]);
    this.view = options.view;
};

_.extend(bbGrid.FilterView.prototype, Backbone.View.prototype, {
    tagName: 'tr',
    className: 'bbGrid-filter-bar',
    initialize: function(options){
        options.view._collection = options.view.collection;
    },
    onFilter: function(event){        
        var options = {},
            self = this,
            collection = new Backbone.Collection(this.view._collection.models);
        this.view.setCollection(collection);
        _.each($('*[name=filter]', this.$el), function(el){
            var text = $(el).val().trim();            
            options[el.className] = text;
        });
        if(_.keys(options).length) self.filter(collection, options);
        this.view.trigger('filter');
    },
    filter: function(collection, options){
        var keys = _.keys(options),
            key = _.first(keys),
            text = options[key];
        if(!keys.length)
            return collection;
        delete options[key];
        if(text.length > 0)
            collection.reset(_.filter(collection.models, function(model){
                var option = model.get(key);
                if(option) return ("" + option).toLowerCase().indexOf(text.toLowerCase()) >= 0;
                else return false;
            }),{silent: true});
        this.filter(collection, options);
    },
    render: function(){
        var options ={},
            self = this;
        _.each(this.view.colModel, function(col){
            if(col.filter)
                options[col.name] = _.uniq(self.view.collection.pluck(col.filterColName || col.name));
        });
        var filterBar = _.template(
            '<% if(isMultiselect){%>\
                <td></td>\
            <%} if(isContainSubgrid){%>\
                <td></td>\
            <% } %>\
            <%_.each(cols, function(col){%>\
                <td>\
                    <%if(col.filter){%>\
                        <<% if(col.filterType=="input"){%>input<%}else{%>select<%}%> class="<%if(col.filterColName){%><%=col.filterColName%><%}else{%><%=col.name %><%}%>" \
                            name="filter" type="text">\
                    <% if(col.filterType!="input"){%>\
                    <option value="">Все</option>\
                        <% _.each(options[col.name], function(option){%>\
                            <option value="<%=option%>"><%=option%></option>\
                        <%})%>\
                    </select><%}%>\
                    <%}%>\
                </td>\
            <%})%>'),
            filterBarHtml = filterBar({
                isMultiselect: this.view.multiselect,
                isContainSubgrid: this.view.subgrid,
                cols: _.filter(this.view.colModel, function(col){return !col.hidden;}),
                options: options
            });

        this.$el.html(filterBarHtml);
        return this.$el;
    }
});

bbGrid.FilterView.extend = Backbone.View.extend;

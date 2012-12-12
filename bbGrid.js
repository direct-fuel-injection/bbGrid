/* 
 * Backbone.js + Bootstrap GridЋ  by dfi; 21.11.2012
 *
 */


var bbGrid = {};

/* Main Container - top bar, table($grid), nav bar
 * Models of Collections must have [id] !
 * */

bbGrid.View = function(options) {
    this.timeit = function(callback){
        var start = new Date();
        callback();
        var end = new Date();
        alert((1000 * (end.getSeconds() - start.getSeconds()) + end.getMilliseconds() - start.getMilliseconds()).toString() + "ms to render");
    }
    
//    this.events =  {
//        'keyup input[name=search]': 'onSearch'
//    };

    this.rowViews = {};
    this.selectedRows = [];
    
    _.extend(this, options);
    Backbone.View.apply(this, [options]);
    _.bindAll(this, 'numberComparator', 'stringComparator');
    
    if(!this.collection){
        alert('bbGrid: collection param is undefined');
        return false;
    }
    
    this.collection.view = this;
    
    this.on('selected', (this.subgrid) ? this.toggleSubgridRow : this.resetSelection);
    this.on('pageChanged', this.onPageChanged);
    this.on('sort', this.onSort);
    this.on('checkall', this.onCheckAll);
    this.on('rowDblClick', this.onDblClick);

    this.render();

    if(this.autofetch){
        var self = this;
        this.toggleLoading(true);
        this.collection.fetch({silent: true, success: function(){ self.render(); } });
        
        this.autofetch = false;
    }
    
    this.collection.on('reset', this.renderPage, this);
    this.collection.on('add', this.rowsHandler, this);
//    this.collection.on('change', this.rowsHandler, this);
};

_.extend(bbGrid.View.prototype, Backbone.View.prototype, {
    tagName: 'div',
    className: 'bbGrid-container container',
    render: function(){        
//        console.log('Render', this);
        if(this.width) this.$el.css('width', this.width+'px');
        
        if(!this.$grid){
            this.$grid = $('<table class="bbGrid-grid table table-hover table-bordered table-condensed" />');
            if(this.caption)
                this.$grid.append('<caption>'+this.caption+'</caption>');
            this.$grid.appendTo(this.el);
//            console.log('Table created');
        }
        if(!this.$thead){
            this.thead = new bbGrid.TheadView({view: this});
            this.$thead = this.thead.render();
            this.$grid.append(this.$thead);
//            console.log('Columns created');
        }
//        if(!this.$topbar){
//            this.$topbar = $('<input name="search" type="text" placeholder="Поиск">');
//            this.$grid.before(this.$topbar);
//        }
        if(!this.$navBar){
            this.navBar = new bbGrid.NavView({view: this});
            this.$navBar = this.navBar.render();
            this.$grid.after(this.$navBar);
            this.$loading = $('<div class="bbGrid-loading progress progress-info progress-striped active"><div class="bar bbGrid-loading-progress">Загрузка...</div></div>');
            this.$navBar.prepend(this.$loading);
        }
        
        $(this.container).append(this.$el);
        
        this.renderPage();
        return this;
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
        interval.s = (page - 1) * this.rows;
        interval.e = page * this.rows;
        if( interval.e > this.collection.length)
            interval.e = this.collection.length;
        return interval;
    },
    clearGrid: function(){
        for(key in this.rowViews) this.rowViews[key].remove();
        this.rowViews = {};
        $('tbody', this.$el).html('');
    },
    toggleLoading: function(isToToggle){
        if(this.$buttonsContainer)
            this.$buttonsContainer.toggle(!isToToggle);
        if(this.$pager)
            this.$pager.toggle(!isToToggle);
        this.$loading.toggle(isToToggle);
    },
    showCollection: function(collection){
        var self = this;
        this.clearGrid();
         _.each( collection, function(model) {
            self.renderRow(model);
        });
        if(collection.length == 0 && !this.autofetch){
            var colspan = (this.multiselect) ? this.colModel.length+1 : this.colModel.length;
            this.$grid.append('<tbody><tr class="bbGrid-noRows"><td colspan="'+colspan+'">Нет записей</td></tr></tbody>');
        }
    },
    setRowSelected: function(options){
        
    },
    toggleSubgridRow: function(model, $el, options){
        options = (options == undefined) ? {} : options;
        var View = (this.subgridAccordion) ? this : this.rowViews[model.id];
        if(View.$subgridContainer){
            $('td.bbGrid-subgrid-control i', View.$subgridContainer.prev()).removeClass('icon-minus');

            if(options.isShown)
                View.$subgridContainer.html('');
            else {
                View.$subgridContainer.remove();
                delete View.$subgridContainer;
            }
            
            if (View.expandedRowId == model.id && !options.isShown)
                return false;
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
            if(this.rowViews[key].selected != checked)
                this.rowViews[key].trigger('select');
        }
    },
    rowsHandler: function(model, collection, options, el){
        if(collection.length == options.index+1)
            this.renderPage();
    },
    renderRow: function(model){
        if(this.rows == _.size(this.rowViews))
            return false;
        this.rowViews[model.id] = new bbGrid.RowView({model: model, view: this});
        this.$grid.append(this.rowViews[model.id].render().el);
    },
    renderPage: function(){
        this.toggleLoading(true);
        if(this.pager) this.pager.render();
        
        var interval = this.getIntervalByPage(this.currPage);
        this.showCollection(this.collection.models.slice(interval.s, interval.e));

        this.toggleLoading(false);
        if(this.onReady && !this.autofetch)
            this.onReady();
    },
    onSort: function(event){
        var $el = $(event.currentTarget);
        $('thead th i', this.$el).removeClass();
        
        var col = _.find(this.colModel, function(col){return col.title == $el.text();});
        if(!col || (col && col.name == 'bbGrid-actions-cell'))
            return false;
        this.rsortBy(col);
        
        if(this.sortOrder == 'asc')
            $('i', $el).addClass('icon-chevron-up');
        else
            $('i', $el).addClass('icon-chevron-down');

        this.renderPage();
    },
//    onSearch: function(event){
//        var $el = $(event.target);
//        var text = $el.val();
//        if (text){
//            var pattern = new RegExp(text,"gi");
//            var collection = _(this.collection.filter(function(data) {
//                return pattern.test(data.get("bankname"));
//            }));
//            this.showCollection(collection._wrapped);
//        }else
//            this.renderPage();
//    },
    onDblClick: function(model, $el){
        if(this.onRowDblClick)
            this.onRowDblClick(model);
    },
    onPageChanged: function(event){        
        var $el = $(event.currentTarget);
        var className = $el.attr('class');
        // get page number
        var page = parseInt((event.target.tagName == 'INPUT') ? $el.val(): $el.text());

        switch(className){
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
        }
        
        if (page > this.cntPages || page <= 0)
            page = null;
        
        if(page && this.currPage != page){
            this.currPage = page;
            // set active
            $('div.bbGrid-pager li', this.$el).removeClass('active');
            $('.bbGrid-page-input', this.$pager).val(this.currPage);
            
//            $(liItems[page]).addClass('active');
            if(this.currPage == 1){
                $('div.bbGrid-pager a.left,.first', this.$el).parent().addClass('active');
            }
            if(this.currPage >= this.cntPages)
                $('div.bbGrid-pager a.right,.last', this.$el).parent().addClass('active');
            // set currPage
            this.renderPage();
        }
    },
    resetSelection: function(model){
        if(!this.multiselect)
            $('tr', this.$el).removeClass('warning');
        
    },
    getSelectedModels: function(){
        var self = this;
        return _.map(this.selectedRows, function(id){ return self.collection.get(id)});
    }

});

bbGrid.View.extend = Backbone.View.extend;

/* View of Model */
bbGrid.RowView = function(options){
    this.events = {
        "click td": "setSelection",
        "dblclick td": "onDblClick"
//        "click input[type=checkbox]": "setSelection"
    };
    Backbone.View.apply(this, [options]);
    /* alias to bbGrid.View*/
    this.view = options.view;
    this.on('select', this.setSelection);
    this.model.on('remove', this.modelRemoved, this);
};

_.extend(bbGrid.RowView.prototype, Backbone.View.prototype, {
    tagName: 'tr',
    modelRemoved: function(model, collection, options){
        var self = this;
        this.view.selectedRows = _.reject(this.view.selectedRows,
            function(rowId){ return rowId == self.model.id; }
        );
        this.remove();
    },
    remove: function(){
        this.model.off();
        this.$el.remove();
        return this;
    },
    onDblClick: function(event){
        this.view.trigger("rowDblClick", this.model, this.$el);
    },
    setSelection: function(options){
        options = (options) ? options : {};
        if(options.currentTarget && options.currentTarget.className == 'bbGrid-actions-cell')
            return false;
        this.view.trigger("selected", this.model, this.$el, options);
        this.$el.addClass('warning');
        
        if(this.view.multiselect || this.view.subgrid){
            this.selected = (this.selected) ? false : true;
            $('input[type=checkbox]', this.$el).attr('checked', this.selected);
            if(!this.selected && !options.isShown)  this.$el.removeClass('warning');
        }
        else
            this.selected = true;
        
        if(this.selected)
            if(this.view.multiselect)
                this.view.selectedRows.push(this.model.id);
            else
                this.view.selectedRows = [this.model.id];
        else {
            var self = this;
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
        var row = _.template('<% if(isMultiselect){%><td><input type="checkbox" <% if(isChecked){%>checked="checked"<%}%>></td><%} if(isContainSubgrid){%><td class="bbGrid-subgrid-control"><i class="icon-plus"></td><%} _.each(values, function(row){%><td <% if(row.name == "bbGrid-actions-cell") {%>class="bbGrid-actions-cell"<%}%>><%=row.value%></td><%})%>');
        var cols = _.filter(this.view.colModel, function(col){ return !col.hidden; });
        var isChecked = ($.inArray(this.model.id, this.view.selectedRows) >= 0);
        var html = row( {
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            isChecked: isChecked,
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
        this.view.cntPages = Math.ceil(this.view.collection.length / this.view.rows);
        if(this.view.currPage){
            if(this.view.currPage > this.view.cntPages)
                this.view.currPage = this.view.cntPages;
        }
        else this.view.currPage = 1;
       
        var pager = _.template('<div class="span bbGrid-pager"><ul class="nav nav-pills"><li<%if(page == 1){%> class="active"<%}%>><a class="first"><i class="icon-step-backward"/></a></li><li <%if(page == 1){%> class="active"<%}%>><a class="left"><i class="icon-backward"/></a></li><li><div class="bbGrid-page-counter" style="float:left">Стр.</div><input class="bbGrid-page-input" value="<%=page%>" type="text"><div class="bbGrid-page-counter"> из <%=cntpages%> </div></li><li<%if(page == cntpages){%> class="active"<%}%>><a class="right"><i class="icon-forward"/></a></li><li<%if(page == cntpages){%> class="active"<%}%>><a class="last"><i class="icon-step-forward"/></a></ul></div><% if(rowlist){%><div class="bbGrid-page-counter" style="float:left; margin-top:2px">Cтрок на странице:</div><select class="bbGrid-pager-rowlist"><% _.each(rowlist, function(val){%><option <% if(rows == val){%>selected="selected"<%}%>><%=val%></option><%})%></select><%}%>');
        var pagerHtml = pager({page: this.view.currPage, cntpages: this.view.cntPages, rows: this.view.rows, rowlist: (this.view.rowList) ? this.view.rowList : false });
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
//        var colNames = (this.view.colNames == undefined) ? _(this.view.collection.at(0).attributes).keys() : this.view.colNames;
        var row = _.template('<tr><% if(isMultiselect){%><th style="width:15px"><input type="checkbox"></th><%} if(isContainSubgrid){%><th style="width:15px"/><%} _.each(values, function(value){%><th><%=value%><i /></th><%})%></tr>');
        var cols = _.filter(this.view.colModel, function(col){ return !col.hidden; });
        var theadHtml = row({
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            values: _.map(cols, function(col){return (col.title) ? col.title : col.name;})
        });
        this.$el.html(theadHtml);
        
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
    render: function(){
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
        if(!this.view.$pager){
            this.view.pager = new bbGrid.PagerView({view: this.view});
            this.view.$pager = this.view.pager.render();
            this.view.$pager.appendTo(this.$el);
        }
        
        return this.$el;
    }
});

bbGrid.NavView.extend = Backbone.View.extend;
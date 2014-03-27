//     bbGrid.js 0.8.5

//     (c) 2012-2013 Minin Alexey, direct-fuel-injection.
//     bbGrid may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://direct-fuel-injection.github.com/bbGrid/
//
//     This is a forked version, maintained by Dirk Bunk: https://github.com/krix/bbGrid/blob/master/bbGrid.js
//     Changes:
//     21.03.2014, Dirk Bunk: Changed 'icon-...' to 'glyphicon glyphicon-...' to make use of Bootstrap 3.
//     24.03.2014, Dirk Bunk: Changed 'model.id' to 'model.cid' to correctly fill 'view.selectedRows' again.
//     25.03.2014, Dirk Bunk: Changed class 'warning' to 'selected', to better fit our existing style sheets.
//     26.03.2014, Dirk Bunk: Make 'bbGrid' optionally an AMD.
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['underscore', 'backbone'], function (_, Backbone) {
            return factory(_, Backbone);
        });
    } else {
        // Browser globals
        return factory(_, Backbone);
    }
}(function(_, Backbone){
    var templateSettings = {
          evaluate: /<%([\s\S]+?)%>/g,
          interpolate: /<%=([\s\S]+?)%>/g,
          escape: /<%-([\s\S]+?)%>/g
        }, 
        viewOptions,
        bbGrid = this.bbGrid = {
            'VERSION': '0.8.3',
            'lang': 'en',
            'setDict': function (lang) {
                if (bbGrid.Dict.hasOwnProperty(lang)) {
                    this.lang = lang;
                }
            }
        };

    bbGrid.Dict = {
        'en': {
            loading: 'Loading...',
            noData: 'No rows',
            search: 'Search',
            rowsOnPage: 'Rows on page',
            page: 'Pg',
            all: 'All',
            prep: 'of'
        },
        'ru': {
            loading: 'Загрузка',
            noData: 'Нет записей',
            search: 'Поиск',
            rowsOnPage: 'Cтрок на странице',
            all: 'Все',
            page: 'Стр',
            prep: 'из'
        }
    };

    viewOptions = ['autofetch', 'buttons', 'actions', 'colModel', 'container',
        'enableSearch', 'multiselect', 'rows', 'rowList', 'selectedRows',
        'subgrid', 'subgridControl', 'subgridAccordion', 'onRowClick', 'onRowDblClick', 'onReady',
        'onBeforeRender', 'onBeforeCollectionRequest', 'onRowExpanded',
        'onRowCollapsed', 'events', 'searchList'];

    bbGrid.RowView = function (options) {
        this.events = {
            'click td[class!=bbGrid-actions-cell]': 'setSelection',
            'keypress td[contenteditable="true"]': 'onInput',
            'blur td[contenteditable="true"]': 'onCancel',
            'dblclick td[class!=bbGrid-actions-cell]': 'onDblClick'
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
        template: _.template(
            '<% if (isMultiselect) {%>\
            <td class="bbGrid-multiselect-control"><input type="checkbox" <% if (isDisabled) { %>disabled="disabled"<% } %><% if (isChecked) {%>checked="checked"<%}%>></td>\
            <%} if (isContainSubgrid) {%>\
                <td class="bbGrid-subgrid-control">\
                    <i class="glyphicon glyphicon-plus<%if (isSelected) {%> glyphicon glyphicon-minus<%}%>">\
                </td>\
            <%} _.each(values, function (row) {%>\
                <td contenteditable="<%=row.editable || false%>" <% if (row.name === "bbGrid-actions-cell") {%>class="bbGrid-actions-cell"<%}%>>\
                    <%=row.value%>\
                </td>\
            <%})%>', null, templateSettings
        ),
        onInput: function (event) {
            if (event.which === 13) {
                var $target = $(event.currentTarget), col,
                    $parent = $target.closest('tr'),
                    colIndex = $parent.find('> td').index($target);
                col = _.find(this.view.colModel, function (col, index) {
                    return index === colIndex;
                });
                this.model.set(col.name, $target.html());
                $target.blur();
                event.stopPropagation();
            }
        },
        onCancel: function (event) {
            this.render();
        },
        modelRemoved: function (model) {
            var self = this,
                view = this.view.subgridAccordion ? this.view : this.view.rowViews[model.cid];
            if (view && view.$subgridContainer) {
                view.$subgridContainer.remove();
            }
            this.view.selectedRows = _.reject(this.view.selectedRows, function (rowId) {
                return rowId === self.model.cid;
            });
            this.remove();
        },
        modelChanged: function () {
            this.render();
            if (this.view.onReady && !this.view.autofetch) {
                this.view.onReady();
            }
        },
        onDblClick: function (event) {
            this.view.trigger("rowDblClick", this.model, this.$el);
        },
        setSelection: function (options) {
            options = options || {};
            var target = options.currentTarget || undefined,
                className = target ? target.className : undefined,
                self = this,
                $control = $(target).closest('tr').find('td.bbGrid-multiselect-control input');
            if ($control && $control.is(':disabled') && className !== 'bbGrid-subgrid-control') {
                return false;
            }
            if (!(this.view.multiselect && this.view.subgrid && className !== 'bbGrid-subgrid-control')) {
                this.view.trigger("selected", this.model, this.$el, options);
            }
            if (this.view.multiselect && className === 'bbGrid-subgrid-control') {
                return false;
            }
            if (!this.view.selectionEnabled) {
                return false;
            }
            this.$el.addClass('selected');
            if (this.view.multiselect || this.view.subgrid) {
                this.selected = this.selected ? false : true;
                this.selected = options.isShown || this.selected;
                $('input[type=checkbox]', this.$el).prop('checked', this.selected);
                if (!this.selected && !options.isShown) {
                    this.$el.removeClass('selected');
                }
            } else {
                this.selected = true;
            }
            if (this.selected || options.isShown) {
                if (this.view.multiselect || (this.view.subgrid && !this.view.subgridAccordion)) {
                    this.view.selectedRows.push(this.model.cid);
                } else {
                    this.view.selectedRows = [this.model.cid];
                }
            } else {
                this.view.selectedRows = _.reject(this.view.selectedRows,
                    function (rowId) {
                        return rowId === self.model.cid;
                    });
            }
            if (this.view.onRowClick) {
                this.view.onRowClick(this.model, options);
            }
        },
        getPropByStr: function (object, prop) {
            var props = prop.split('.'), obj = object;
            while (props.length && (obj = obj[props.shift()]));
            return obj || object[prop];
        },
        render: function () {
            var self = this, isChecked, isDisabled, html,
                cols = _.filter(this.view.colModel, function (col) {return !col.hidden; });
            isChecked = ($.inArray(this.model.cid, this.view.selectedRows) >= 0);
            isDisabled = this.model.get('cb_disabled') || false;
            html = this.template({
                isMultiselect: this.view.multiselect,
                isContainSubgrid: this.view.subgrid && this.view.subgridControl,
                isSelected: this.selected || false,
                isChecked: isChecked,
                isDisabled: isDisabled,
                values: _.map(cols, function (col) {
                    if (col.actions) {
                        col.name = 'bbGrid-actions-cell';
                        if (_.isFunction(col.actions)) {
                            col.value = col.actions.call(self, self.model.cid, self.model.attributes, self.view);
                        } else {
                            col.value = self.view.actions[col.actions].call(self, self.model.cid, self.model.attributes, self.view);
                        }
                    } else {
                        col.value = self.getPropByStr(self.model.attributes, col.name);
                    }
                    return col;
                })
            });
            if (isChecked) {
                this.selected = true;
                this.$el.addClass('selected');
            }
            this.$el.html(html);
            return this;
        }
    });

    bbGrid.RowView.extend = Backbone.View.extend;

    bbGrid.PagerView = function (options) {
        this.events = {
            'click a': 'onPageChanged',
            'change .bbGrid-pager-rowlist': 'onRowsChanged',
            'change .bbGrid-page-input': 'onPageChanged'
        };

        Backbone.View.apply(this, [options]);
        this.view = options.view;
    };

    _.extend(bbGrid.PagerView.prototype, Backbone.View.prototype, {
        tagName: 'div',
        className: 'bbGrid-pager-container span offset',
        template: _.template(
            '<div class="span bbGrid-pager">\
                <ul class="nav nav-pills">\
                    <li<%if (page <= 1) {%> class="active"<%}%>>\
                        <a class="first"><i class="glyphicon glyphicon-step-backward"/></a>\
                    </li>\
                    <li <%if (page <= 1) {%> class="active"<%}%>>\
                        <a class="left"><i class="glyphicon glyphicon-backward"/></a>\
                    </li>\
                    <li>\
                        <div class="bbGrid-page-counter pull-left"><%=dict.page%>.</div>\
                        <input class="bbGrid-page-input" value="<%=page%>" type="text">\
                        <div class="bbGrid-page-counter-right pull-right"> <%=dict.prep%> <%=cntpages%> </div>\
                    </li>\
                    <li<%if (page === cntpages || page === 0) {%> class="active"<%}%>>\
                        <a class="right"><i class="glyphicon glyphicon-forward"/></a>\
                    </li>\
                    <li<%if (page === cntpages || page === 0) {%> class="active"<%}%>>\
                        <a class="last"><i class="glyphicon glyphicon-step-forward"/></a>\
                    </li>\
                </ul>\
                </div>\
            <% if (rowlist) {%>\
                <div class="bbGrid-pager-rowlist-label pull-left"><%=dict.rowsOnPage%>:</div>\
                <select class="bbGrid-pager-rowlist">\
                    <% _.each(rowlist, function (val) {%>\
                        <option value="<%=val.value%>" <% if (rows === val.value) {%>selected="selected"<%}%>><%=val.label%></option>\
                    <%})%>\
                </select>\
            <%}%>', null, templateSettings
        ),
        onRowsChanged: function (event) {
            this.view.rows = parseInt($(event.target).val(), 10) || this.view.rows;
            if (this.view.currPage >= Math.ceil(this.view.collection.length / this.view.rows)) {
                this.view.currPage = 1;
            }
            this.render();
            this.view.render();
        },
        onPageChanged: function (event) {
            this.view.trigger('pageChanged', event);
        },
        initPager: function () {
            var pagerHtml, rowList, self = this;
            if (!this.view.loadDynamic) {
                this.view.cntPages = Math.ceil(this.view.collection.length / this.view.rows);
            }
            if (this.view.currPage > 1 && this.view.currPage > this.view.cntPages) {
                this.view.currPage = this.view.cntPages;
            }
            this.view.currPage = this.view.currPage || 1;
            this.view.cntPages = this.view.cntPages || 1;
            rowList = _.map(this.view.rowList, function (row) {
                if (!_.isObject(row)) {
                    row = {value: row, label: row};
                }
                if (row.value === 0) {
                    row = {
                        value: self.view.collection.length,
                        label: self.view.dict.all
                    };
                }
                return row;
            });
            pagerHtml = this.template({
                dict: this.view.dict,
                page: this.view.currPage,
                cntpages: this.view.cntPages,
                rows: this.view.rows,
                rowlist: rowList && rowList.length ? rowList : false
            });
            if (!this.view.rowList) {
                this.$el.addClass('bbGrid-pager-container-norowslist');
            }
            this.$el.html(pagerHtml);
        },
        render: function () {
            this.initPager();
            return this.$el;
        }
    });

    bbGrid.PagerView.extend = Backbone.View.extend;

    bbGrid.TheadView = function (options) {
        this.events = {
            'click th': 'onSort',
            'click input[type=checkbox]': 'onAllCheckbox'
        };
        Backbone.View.apply(this, [options]);
        this.view = options.view;
    };

    _.extend(bbGrid.TheadView.prototype, Backbone.View.prototype, {
        tagName: 'thead',
        className: 'bbGrid-grid-head',
        template: _.template(
            '<% if (isMultiselect) {%>\
                <th style="width:15px"><input type="checkbox"></th>\
            <%} if (isContainSubgrid) {%>\
                <th style="width:15px"/>\
                <%} _.each(cols, function (col) {%>\
                    <th <%if (col.width) {%>style="width:<%=col.width%>"<%}%>><%=col.title%><i <% \
                        if (col.sortOrder === "asc" ) {%>class="glyphicon glyphicon-chevron-up"<%} else \
                            if (col.sortOrder === "desc" ) {%>class="glyphicon glyphicon-chevron-down"<% } %>/></th>\
            <%})%>', null, templateSettings
        ),
        onAllCheckbox: function (event) {
            this.view.trigger('checkall', event);
        },
        onSort: function (event) {
            this.view.trigger('sort', event);
        },
        render: function () {
            var cols, theadHtml;
            if (!this.$headHolder) {
                this.$headHolder = $('<tr/>', {'class': 'bbGrid-grid-head-holder'});
                this.$el.append(this.$headHolder);
            }
            cols = _.filter(this.view.colModel, function (col) {return !col.hidden; });
            cols = _.map(cols, function (col) { col.title = col.title || col.name; return col; });
            this.view.colLength = cols.length + (this.view.multiselect ? 1 : 0) + (this.view.subgrid && this.view.subgridControl ? 1 : 0);
            theadHtml = this.template({
                isMultiselect: this.view.multiselect,
                isContainSubgrid: this.view.subgrid && this.view.subgridControl,
                cols: cols
            });
            this.$headHolder.html(theadHtml);
            if (!this.view.$filterBar && this.view.enableFilter) {
                this.view.filterBar = new this.view.entities.FilterView({ view: this.view });
                this.view.$filterBar = this.view.filterBar.render();
                this.$el.append(this.view.$filterBar);
            }
            return this.$el;
        }
    });

    bbGrid.TheadView.extend = Backbone.View.extend;

    bbGrid.NavView = function (options) {
        Backbone.View.apply(this, [options]);
        this.view = options.view;
    };

    _.extend(bbGrid.NavView.prototype, Backbone.View.prototype, {
        tagName: 'div',
        className: 'bbGrid-grid-nav row',
        render: function () {
            if (this.view.buttons) {
                var self = this, btn, btnHtml, $button;
                this.view.$buttonsContainer = $('<div/>', {'class': 'bbGrid-navBar-buttonsContainer btn-group span'});
                this.view.buttons = _.map(this.view.buttons, function (button) {
                    if (!button) {
                        return undefined;
                    }
                    btn = _.template('<button <%if (id) {%>id="<%=id%>"<%}%> class="btn btn-mini" type="button"><%=title%></button>', null, templateSettings);
                    btnHtml = button.html || btn({id: button.id, title: button.title});
                    $button = $(btnHtml).appendTo(self.view.$buttonsContainer);
                    if (button.onClick) {
                        $button.click(_.bind(button.onClick, self.view));
                    }
                    return $button;
                });
                this.$el.append(this.view.$buttonsContainer);
            }
            if (!this.view.$pager && this.view.rows) {
                this.view.pager = new this.view.entities.PagerView({ view: this.view });
                this.view.$pager = this.view.pager.render();
                this.view.$pager.appendTo(this.$el);
            }
            return this.$el;
        }
    });

    bbGrid.NavView.extend = Backbone.View.extend;

    bbGrid.SearchView = function (options) {
        this.events = {
            'click li > a': 'setSearchOption'
        };
        if (options.view.loadDynamic) {
            this.events = _.extend(this.events, {'change input[name=search]': 'onSearch'});
        } else {
            this.events = _.extend(this.events, {'keyup input[name=search]': 'onSearch'});
        }
        Backbone.View.apply(this, [options]);
        this.view = options.view;
    };

    _.extend(bbGrid.SearchView.prototype, Backbone.View.prototype, {
        tagName: 'div',
        className: 'bbGrid-search-bar pull-right',
        template: _.template(
            '<div class="input-append">\
                <input name="search" class="span2" type="text" placeholder="<%=dict.search%>">\
                <div class="btn-group dropup">\
                    <button class="btn dropdown-toggle" data-toggle="dropdown">\
                    <span name="column"><%=cols[0].title%></span>\
                    <span class="caret"></span>\
                    </button>\
                    <ul class="dropdown-menu pull-right">\
                        <% _.each(cols, function (col, index) {%>\
                            <li <% if (index === searchOptionIndex) { %>class="active"<% } %>>\
                                <a name="<%=index%>" href="#"><%=col.title%></a>\
                            </li>\
                        <%})%>\
                    </ul>\
                </div>\
            </div>', null, templateSettings
        ),
        initialize: function (options) {
            _.bindAll(this, 'setSearchOption');
            options.view._collection = options.view.collection;
            this.searchOptionIndex = this.searchOptionIndex || 0;
            this.searchText = '';
        },
        onSearch: function (event) {
            var self = this,
                $el = $(event.target);
            this.searchText = $el.val().trim();
            this.view.collection = this.view._collection;
            if (this.searchText && !this.view.loadDynamic) {
                this.view.setCollection(new this.view._collection.constructor(
                    this.view.collection.filter(function (data) {
                        var value = data.get(self.view.colModel[self.searchOptionIndex].name);
                        return ("" + value).toLowerCase().indexOf(self.searchText.toLowerCase()) >= 0;
                    })
                ));
            }
            this.view.collection.trigger('reset');
        },
        setSearchOption: function (event) {
            var el = event.currentTarget;
            $('a[name=' + this.searchOptionIndex + ']', this.$el).parent().removeClass('active');
            $(el).parent().addClass('active');
            this.searchOptionIndex = Number(el.name);
            $('button span[name=column]', this.$el).text(el.text);
        },
        render: function () {
            var self = this,
                searchColList = _.filter(this.view.colModel, function (col) {
                    if (self.view.searchList && self.view.searchList.length) {
                        return col.name && !col.hidden && $.inArray(col.name, self.view.searchList) >= 0;
                    } else {
                        return col.name && !col.hidden;
                    }
                }),
                searchBarHtml = this.template({
                    dict: this.view.dict,
                    searchOptionIndex: this.searchOptionIndex,
                    cols: searchColList
                });
            this.$el.html(searchBarHtml);
            return this.$el;
        }
    });

    bbGrid.SearchView.extend = Backbone.View.extend;

    bbGrid.FilterView = function (options) {
        this.events = {
            'change select[name=filter]': 'onFilter'
        };
        if (options.view.loadDynamic) {
            this.events = _.extend(this.events, {
                'change input[name=filter]': 'onFilter'
            });
        } else {
            this.events = _.extend(this.events, {
                'keyup input[name=filter]': 'onFilter'
            });
        }
        Backbone.View.apply(this, [options]);
        this.view = options.view;
    };

    _.extend(bbGrid.FilterView.prototype, Backbone.View.prototype, {
        tagName: 'tr',
        className: 'bbGrid-filter-bar',
        template: _.template(
            '<% if (isMultiselect) {%>\
                <td></td>\
            <%} if (isContainSubgrid) {%>\
                <td></td>\
            <% } %>\
            <%_.each(cols, function (col) {%>\
                <td>\
                    <%if (col.filter) {%>\
                        <<% if (col.filterType === "input") \
                            {%>input<%}else{%>select<%\
                            }%> class="<%if (col.filterColName) {%><%=col.filterColName%><%}else{%><%=col.name %><%}%>" \
                            name="filter" type="text" value="<%=filterOptions[col.name]%>">\
                    <% if (col.filterType !== "input") {%>\
                    <option value=""><%=dict.all%></option>\
                        <% _.each(options[col.name], function (option) {%>\
                            <option <% if (filterOptions[col.filterColName || col.name] === option) {%>\
                                selected="selected"<% } %>\
                                value="<%=option%>"><%=option%></option>\
                        <%})%>\
                    </select><%}%>\
                    <%}%>\
                </td>\
            <%})%>', null, templateSettings),
        initialize: function (options) {
            options.view._collection = options.view.collection;
            options.view.filterOptions = {};
            this.options = {};
        },
        onFilter: function () {
            var text, self = this, collection;
            _.each($('*[name=filter]', this.$el), function (el) {
                text = $.trim($(el).val());
                if (text) {
                    self.view.filterOptions[el.className] = text;
                } else {
                    delete self.view.filterOptions[el.className];
                }
            });
            if (!this.view.loadDynamic) {
                collection = new Backbone.Collection(this.view._collection.models);
                this.view.setCollection(collection);
                if (_.keys(this.view.filterOptions).length) {
                    self.filter(collection, _.clone(this.view.filterOptions));
                }
            }
            this.view.trigger('filter', {silent: !this.view.loadDynamic});
        },
        filter: function (collection, options) {
            var keys = _.keys(options), option,
                key = _.first(keys),
                text = options[key];
            if (!keys.length) {
                return collection;
            }
            delete options[key];
            if (text.length > 0) {
                collection.reset(_.filter(collection.models, function (model) {
                    option = model.get(key);
                    if (option) {
                        return ("" + option).toLowerCase().indexOf(text.toLowerCase()) >= 0;
                    } else {
                        return false;
                    }
                }), {silent: true});
            }
            this.filter(collection, options);
        },
        render: function () {
            var self = this, filterBarHtml;
            _.each(this.view.colModel, function (col) {
                if (col.filter) {
                    self.options[col.name] = _.uniq(self.view.collection.pluck(col.filterColName || col.name));
                }
            });
            filterBarHtml = this.template({
                dict: this.view.dict,
                isMultiselect: this.view.multiselect,
                isContainSubgrid: this.view.subgrid && this.view.subgridControl,
                filterOptions: this.view.filterOptions,
                cols: _.filter(this.view.colModel, function (col) {return !col.hidden; }),
                options: self.options
            });
            this.$el.html(filterBarHtml);
            return this.$el;
        }
    });

    bbGrid.FilterView.extend = Backbone.View.extend;
    
    bbGrid.View = function (options) {
        var self = this, json_options = {};
        options || (options = {});
        json_options = $(options.container).find('script[type="application/json"]').html() || {};
        if (json_options.length) {
            json_options = $.parseJSON(json_options);
            _.extend(options, json_options);
        }
        _.extend(this, _.pick(options, _.union(viewOptions, _.values(options.events || {}))));
        Backbone.View.apply(this, [options]);
        _.bindAll(this, 'numberComparator', 'stringComparator');
        this.setDict(bbGrid.lang, options.dict);
        this.on('all', this.EventHandler, this);
        this.entities = _.extend({
            RowView: bbGrid.RowView,
            FilterView: bbGrid.FilterView,
            SearchView: bbGrid.SearchView,
            NavView: bbGrid.NavView,
            TheadView: bbGrid.TheadView,
            PagerView: bbGrid.PagerView
        }, this.entities);
        this.rowViews = {};
        this.selectedRows = [];
        this.currPage = 1;
        if (!this.collection) {
            throw new Error('A "collection" property must be specified');
        }
        this.collection.on("all", this.collectionEventHandler, this);
        this.enableFilter = _.compact(_.pluck(this.colModel, 'filter')).length > 0;
        this.autofetch = !this.loadDynamic && this.autofetch;
        this.render();
        if (this.autofetch) {
            this.collection.fetch();
            this.autofetch = false;
        }
        if (this.loadDynamic) {
            this.collection.parse = function (response) {
                self.cntPages = response.total;
                return response.rows;
            };
        }
    };

    _.extend(bbGrid.View.prototype, Backbone.View.prototype, {
        selectionEnabled: true,
        subgridControl: true,
        lang: bbGrid.lang,
        tagName: 'div',
        className: 'bbGrid-container',
        setDict: function (lang, dict) {
            if (bbGrid.Dict.hasOwnProperty(lang)) {
                this.lang = lang;
            }
            this.dict = bbGrid.Dict[this.lang];
            if (dict) {
                this.dict = $.extend(true, {}, bbGrid.Dict[this.lang], dict);
            }
        },
        EventHandler: function (eventName, option1, option2) {
            var options = arguments[arguments.length - 1];
            switch (eventName) {
            case 'selected':
                if (this.subgrid) {
                    this.toggleSubgridRow(option1, option2, options);
                } else {
                    this.resetSelection();
                }
                break;
            case 'pageChanged':
                this.onPageChanged(option1);
                break;
            case 'sort':
                this.onSort(option1);
                break;
            case 'checkall':
                this.onCheckAll(option1);
                break;
            case 'rowDblClick':
                this.onDblClick(option1, option2);
                break;
            case 'filter':
                this.renderPage(options);
                break;
            case 'refresh':
                this.renderPage();
                this.toggleLoading(false);
                break;
            default:
                break;
            }
        },
        collectionEventHandler: function (eventName, model, collection, options) {
            var self = this;
            switch (eventName) {
            case 'add':
                this.addModelsHandler(model, collection, options);
                break;
            case 'change':
                if (this.enableFilter) {
                    this.filterBar.render();
                }
                break;
            case 'request':
                if (!this.loadDynamic) {
                    this.filterOptions = {};
                    _.each(this.colModel, function (col, index) {
                        self.colModel[index] = _.omit(col, 'sortOrder');
                    });
                }
                if (this.onBeforeCollectionRequest) {
                    this.onBeforeCollectionRequest();
                }
                this.toggleLoading(true);
                break;
            case 'error':
                this.toggleLoading(false);
                break;
            case 'sync':
                this.toggleLoading(false);
                this.renderPage(options);
                break;
            case 'reset':
                this.toggleLoading(false);
                this.renderPage();
                break;
            case 'destroy':
                this.toggleLoading(false);
                break;
            default:
                break;
            }
        },
        render: function () {
            if (this.width) {
                this.$el.css('width', this.width);
            }
            if (!this.$grid) {
                this.$grid = $('<table class="bbGrid-grid table table-bordered table-condensed" />');
                if (this.caption) {
                    this.$grid.append('<caption>' + this.caption + '</caption>');
                }
                this.$grid.appendTo(this.el);
            }
            if (!this.$thead) {
                this.thead = new this.entities.TheadView({view: this});
                this.$thead = this.thead.render();
                this.$grid.append(this.$thead);
            }
            if (!this.$navBar) {
                this.navBar = new this.entities.NavView({view: this});
                this.$navBar = this.navBar.render();
                this.$grid.after(this.$navBar);
                this.$loading = $('<div class="bbGrid-loading progress progress-info progress-striped active"><div class="bar bbGrid-loading-progress">' + this.dict.loading + '</div></div>');
                this.$navBar.prepend(this.$loading);
            }
            if (!this.$searchBar && this.enableSearch) {
                this.searchBar = new this.entities.SearchView({view: this});
                this.$searchBar = this.searchBar.render();
                this.$navBar.append(this.$searchBar);
            }
            $(this.container).append(this.$el);
            if (!this.autofetch) {
                this.renderPage();
            }
            return this;
        },
        setCollection: function (collection) {
            this.collection = collection || new Backbone.Collection();
            this.collection.on('all', this.collectionEventHandler, this);
        },
        numberComparator: function (model) {
            return model.get(this.sortName);
        },
        stringComparator: function (model) {
            return ("" + model.get(this.sortName)).toLowerCase();
        },
        sortBy: function (sortAttributes) {
            var attributes = sortAttributes;
            if (attributes.length) {
                this.collection.reset(this._sortBy(this.collection.models, attributes), { silent: true });
            }
        },
        _sortBy: function (models, attributes) {
            var attr, self = this, sortOrder;
            if (attributes.length === 1) {
                attr = attributes[0].name;
                sortOrder = attributes[0].sortOrder;
                models = _.sortBy(models, function (model) {
                    return model.get(attr);
                });
                if (sortOrder === 'desc') {
                    models.reverse();
                }
                return models;
            } else {
                attr = attributes[0];
                attributes = _.last(attributes, attributes.length - 1);
                models = _.chain(models).sortBy(function (model) {
                    return model.get(attr);
                }).groupBy(function (model) {
                    return model.get(attr);
                }).toArray().value();
                _.each(models, function (modelSet, index) {
                    models[index] = self._sortBy(models[index], attributes, sortOrder);
                });
                return _.flatten(models);
            }
        },
        rsortBy: function (col) {
            var isSort, sortType, boundComparator;
            isSort = (this.sortName && this.sortName === col.name) ? false : true;
            this.sortName = col.name;
            sortType = col.sorttype || 'string';
            this.sortOrder = (this.sortOrder === 'asc') ? 'desc' : 'asc';
            boundComparator = _.bind(this.stringComparator, this.collection);
            switch (sortType) {
            case 'string':
                boundComparator = _.bind(this.stringComparator, this.collection);
                break;
            case 'number':
                boundComparator = _.bind(this.numberComparator, this.collection);
                break;
            default:
                break;
            }
            this.collection.models = isSort ? this.collection.sortBy(boundComparator) : this.collection.models.reverse();
        },
        getIntervalByPage: function (page) {
            var interval = {};
            if (this.rows) {
                interval.s = (page - 1) * this.rows;
                interval.e = page * this.rows;
                if (interval.e > this.collection.length) {
                    interval.e = this.collection.length || this.rows;
                }
            } else {
                interval = {s: 0, e: this.collection.length};
            }
            return interval;
        },
        clearGrid: function () {
            if (this.subgridAccordion) {
                delete this.$subgridContainer;
            }
            _.each(this.rowViews, function (view) {
                view.remove();
            });
            this.rowViews = {};
            $('tbody', this.$el).empty();
        },
        toggleLoading: function (isToToggle) {
            if (isToToggle === undefined) {
                isToToggle = true;
            }
            this.$navBar.show();
            if (this.$buttonsContainer) {
                this.$buttonsContainer.toggle(!isToToggle);
            }
            if (this.$pager) {
                this.$pager.toggle(!isToToggle);
            }
            if (this.$searchBar) {
                this.$searchBar.toggle(!isToToggle);
            }
            if (!this.rows && !this.buttons && !isToToggle) {
                this.$navBar.hide();
            }
            if (this.filterBar) {
                $('.bbGrid-filter-bar', this.$el).find('input,select').prop('disabled', isToToggle);
            }
            this.$loading.toggle(isToToggle);
        },
        showCollection: function (collection) {
            var self = this;
            this.clearGrid();
            _.each(collection, function (model) {
                self.renderRow(model);
            });
            if (collection.length === 0 && !this.autofetch) {
                this.$grid.append('<tbody><tr class="bbGrid-noRows"><td colspan="' + this.colLength + '">' + this.dict.noData + '</td></tr></tbody>');
            }
        },
        setRowSelected: function (options) {
            var event = {}, className;
            options || (options = {});
            if (!this.selectionEnabled) {
                return false;
            }
            if (options.id && _.has(this.rowViews, options.id)) {
                if (this.multiselect) {
                    className = '.bbGrid-multiselect-control';
                }
                event.currentTarget = $('td' + className, this.rowViews[options.id].$el).first()[0];
                event.isShown = options.isShown || false;
                this.rowViews[options.id].setSelection(event);
            }
        },
        toggleSubgridRow: function (model, $el, options) {
            var View, colspan, subgridRow, subgridContainerHtml, colNumber = this.subgridControl ? 1 : 0;
            options = options || {};
            View = this.subgridAccordion ? this : this.rowViews[model.cid];
            
            if (this.subgridAccordion) {
                $('tr', this.$el).removeClass('selected');
                _.each(this.rowViews, function (row) {
                    if (row.model.cid !== model.cid) {
                        row.selected = false;
                    }
                });
            }
            if (View.$subgridContainer) {
                $('td.bbGrid-subgrid-control i', View.$subgridContainer.prev()).removeClass('glyphicon glyphicon-minus');
                View.$subgridContainer.remove();
                delete View.$subgridContainer;
                if (View.expandedRowId === model.cid && !options.isShown) {
                    if (this.onRowCollapsed) {
                        this.onRowCollapsed($('td', View.$subgridContainer)[colNumber], model.cid);
                    }
                    return false;
                }
            }
            $('td.bbGrid-subgrid-control i', $el).addClass('glyphicon glyphicon-minus');
            colspan = this.multiselect ? 2 : 1;
            colspan = this.subgridControl ? colspan : colspan - 1;
            subgridRow = _.template('<tr class="bbGrid-subgrid-row"><% if (control) { %><td colspan="<%=extra%>"/><% } %><td colspan="<%=colspan %>"></td></tr>', null, templateSettings);
            subgridContainerHtml = subgridRow({
                control: this.subgridControl,
                extra: colspan,
                colspan: this.colLength - colspan
            });
            View.$subgridContainer = $(subgridContainerHtml);
            $el.after(View.$subgridContainer);
            View.expandedRowId = model.cid;
            if (this.onRowExpanded) {
                this.onRowExpanded($('td', View.$subgridContainer)[colNumber], model.cid);
            }
        },
        onCheckAll: function (event) {
            var checked = $(event.target).is(':checked');
            _.each(this.rowViews, function (view) {
                if (view.selected !== checked) {
                    if (!view.model.get('cb_disabled')) {
                        view.trigger('select');
                    }
                }
            });
        },
        addModelsHandler: function (model, collection, options) {
            var index = this.collection.indexOf(model);
            if ((index + 1) === this.collection.length) {
                this.renderPage();
            }
        },
        renderRow: function (model) {
            if (this.rows === _.size(this.rowViews)) {
                return false;
            }
            this.rowViews[model.cid] = new this.entities.RowView({model: model, view: this});
            this.$grid.append(this.rowViews[model.cid].render().el);
        },
        renderPage: function (options) {
            options = options || {silent: false};
            var self = this, interval, data;
            if (this.loadDynamic) {
                options.interval = {s: 0, e: this.rows};
                data = {
                    page: self.currPage,
                    rows: this.rows
                };
                if (this.enableSearch && this.searchBar.searchText) {
                    data.search = $.toJSON(this.searchBar.searchText);
                    data.searchOption = self.colModel[this.searchBar.searchOptionIndex].name;
                }
                if (!_.isEmpty(this.filterOptions)) {
                    data.filter = $.toJSON(this.filterOptions);
                }
                if (this.sortSequence && this.sortSequence.length) {
                    data.sort = $.toJSON(this.sortSequence);
                }
                if (!this.autofetch && !options.silent) {
                    this.collection.fetch({
                        type: 'POST',
                        data: data,
                        wait: true,
                        reset: true,
                        silent: true
                    });
                    return false;
                }
            }
            this.selectedRows = [];
            if (this.onBeforeRender) {
                this.onBeforeRender();
            }
            if (!options.silent) {
                this.thead.render();
            }
            if (this.rows && this.pager) {
                this.pager.render();
            }
            interval = options.interval || this.getIntervalByPage(this.currPage);
            this.showCollection(this.collection.models.slice(interval.s, interval.e));
            if (!this.autofetch && this.collection.length >= 0) {
                this.toggleLoading(false);
            }
            if (this.onReady && !this.autofetch) {
                this.onReady();
            }
            if (this.filterBar && (!options.silent || this.loadDynamic)) {
                this.filterBar.render();
            }
        },
        onSort: function (event) {
            var $el, col, newSortAttr = true, self = this;
            if (!this.multisort) {
                $('thead th i', this.$el).removeClass();
            }
            $el = $(event.currentTarget);
            this.sortSequence || (this.sortSequence = []);
            col = _.find(this.colModel, function (col) { return col.title === $el.text(); });
            if (!col || (col && (col.name === 'bbGrid-actions-cell' || !col.index))) {
                return false;
            }
            col.sortOrder = (col.sortOrder === 'asc') ? 'desc' : 'asc';
            if (this.multisort) {
                this.sortSequence = _.map(this.sortSequence, function (attr) {
                    if (attr.name === col.name) {
                        newSortAttr = false;
                        attr.sortOrder = col.sortOrder;
                    }
                    return attr;
                });
                if (newSortAttr) {
                    this.sortSequence.splice(0, 0, {name: col.name, sortOrder: col.sortOrder});
                }
                if (!this.loadDynamic) {
                    this.sortBy(this.sortSequence);
                }
            } else {
                _.each(this.colModel, function (column, index) {
                    if (column.name !== col.name) {
                        delete self.colModel[index].sortOrder;
                    }
                });
                this.sortSequence = [{name: col.name, sortOrder: col.sortOrder}];
                if (!this.loadDynamic) {
                    this.rsortBy(col);
                }
            }
            this.thead.render();
            this.renderPage({silent: !this.loadDynamic});
        },
        onDblClick: function (model, $el) {
            if (this.onRowDblClick) {
                this.onRowDblClick(model);
            }
        },
        onPageChanged: function (event) {
            var $el = $(event.currentTarget),
                className = $el.attr('class'),
                page;
            switch (className) {
            case 'bbGrid-page-input':
                page = parseInt($el.val(), 10) || this.currPage;
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
            if (page > this.cntPages || page <= 0) {
                return false;
            }
            if (this.currPage !== page) {
                this.currPage = page;
                $('div.bbGrid-pager li', this.$el).removeClass('active');
                $('.bbGrid-page-input', this.$pager).val(this.currPage);

                if (this.currPage === 1) {
                    $('div.bbGrid-pager a.left,.first', this.$el).parent().addClass('active');
                }
                if (this.currPage >= this.cntPages) {
                    $('div.bbGrid-pager a.right,.last', this.$el).parent().addClass('active');
                }
                this.renderPage({silent: !this.loadDynamic});
            }
        },
        resetSelection: function () {
            if (!this.multiselect) {
                $('tr', this.$el).removeClass('selected');
            }
        },
        getSelectedModels: function () {
            var self = this;
            return _.map(this.selectedRows, function (id) { return self.collection.get(id); });
        }
    });

    bbGrid.View.extend = Backbone.View.extend;

    return bbGrid;
}));

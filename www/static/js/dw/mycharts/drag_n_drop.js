define(function(require) {
    var $ = require('jquery'),
        multiselection = require('./multiselection'),
        twig = require('./twig_globals'),
        no_reload_folder_change = require('./no_reload_folder_change'),
        handler = require('./handler'),
        cft;

    function readLink(link) {
        var parsed = link.slice(1).split('/'),
            id = {
                org: '',
                folder: 'root'
            };

        if (parsed[0] == 'mycharts') {
            if (parsed.length > 1) id.folder = parsed[1];
        } else {
            id.org =  '/' + parsed[1];
            if (parsed.length > 2) {
                id.folder = parsed[2];
                id.org = '';
            }
        }

        return id;
    }

    function buildLink() {
        var id = cft.getCurrentFolder(),
            link = '';

        link += (id.organization) ? '/organization/' + id.organization : twig.globals.strings.mycharts_base;
        if (id.folder) { link += '/' + id.folder }
        return link;
    }

    function enableChartDrag() {
        var charts = $('div.mycharts-chart-list ul.thumbnails li.chart'),
            dragImage;

        charts.find('*').attr('draggable', 'false');
        charts.attr('draggable', 'true');
        charts.on('dragstart', function(e) {
            var chart_ids = [e.target.getAttribute('data-id')],
                ev = e.originalEvent;
            if (multiselection.selected.has(chart_ids[0])) {
                chart_ids = multiselection.selected.values();
            } else {
                multiselection.selectNone();
            }
            ev.dataTransfer.setData('application/json', JSON.stringify({
                type: 'charts',
                charts: chart_ids
            }));
            dragImage = chart_ids.length == 1 ? e.target : getMultiDragImage(chart_ids);
            ev.dataTransfer.setDragImage(dragImage, 0,0);
            ev.dropEffect = "move";
        });

        charts.on('dragend', function(e) {
            $('ul.folders-left li').removeClass('dragtar');
            $('.custom-drag-image').remove();
        });
    }

    function enableFolderDragForJQO(folders) {
        folders.find('*').attr('draggable', 'false');
        folders.attr('draggable', 'true');
        folders.on('dragstart', function(e) {
            var ev = e.originalEvent,
                tar = e.currentTarget,
                href = $(tar).find('a').attr('href'),
                folder_id = href.slice(href.lastIndexOf('/') + 1, href.length);

            ev.dataTransfer.setData('application/json', JSON.stringify({
                type: 'folder',
                id: folder_id
            }));
            ev.dataTransfer.setDragImage(tar, 0,0);
            ev.dropEffect = "move";
        });

        folders.on('dragend', function(e) {
            $('ul.folders-left li').removeClass('dragtar');
        });
    }

    function enableFolderDrag() {
        enableFolderDragForJQO($('ul.folders-left li').add('ul.subfolders li.span2').not('.add-button'));
    }

    function enableDrag() {
        enableChartDrag();
        enableFolderDragForJQO($('ul.subfolders li.span2').not('.add-button'));
    }

    function moveCharts(charts, id) {
        $.ajax({
            url: '/api/folders/' + id.folder + id.org,
            type: 'PUT',
            processData: false,
            contentType: "application/json",
            data: JSON.stringify({
                add: charts
            }),
            dataType: 'JSON'
        }).done(function() {
            no_reload_folder_change.reloadLink(buildLink());
            console.warn("We're not done yet! Need to update Folder List.");
        }).fail(handler.fail);
    }

    function enableDrop() {
        var drop_targets = $('ul.folders-left li');

        drop_targets.on('dragenter', function(e) {
            e.preventDefault();
            drop_targets.removeClass('dragtar');
            e.currentTarget.classList.add('dragtar');
        });

        drop_targets.on('dragover', function(e) {
            e.preventDefault();
        });

        drop_targets.on('drop', function(e) {
            var trans, id;
            e.preventDefault();
            drop_targets.removeClass('dragtar');
            id = readLink($(e.currentTarget).find('a').attr('href'));
            try {
                trans = JSON.parse(e.originalEvent.dataTransfer.getData('application/json'));
            } catch(e) {
                trans = false;
            }
            if(!trans || typeof(trans.type) === 'undefined') {
                alert("You may drop this here, but I can't work with it");
                return;
            }
            switch (trans.type) {
                case 'charts':
                    moveCharts(trans.charts, id);
                    break;
                case 'folder':
                    console.log(trans.id);
                    break;
                default:
                    console.error("We don't have this type.");
            }
        });
    }

    function getMultiDragImage(chart_ids) {
        var l = chart_ids.length + 5,
            offset = 10,
            div = $('<div class="custom-drag-image" />')
                .css({
                    position: 'absolute',
                    top:-1000,
                    left: -1000,
                })
                .appendTo('ul.thumbnails');
        chart_ids.forEach(function(id, i) {
            $('.thumbnails li.chart[data-id="'+id+'"]')
                .clone(false)
                .css({
                    position: 'absolute',
                    zIndex: l-i,
                    top: (offset*i)+'px',
                    left: (offset*i)+'px',
                    opacity: 1 - (i*0.1)
                })
                .appendTo(div);
        });
        return div.get(0);
    }

    // this needs to become an object exporting several functions soon™
    // (folder drag_n_drop doesn't need to be enabled after chart reload)
    return function() {
        enableChartDrag();
        enableFolderDrag();
        enableDrop();
        no_reload_folder_change.setDragNDropCallback(enableDrag);
        cft = window['ChartFolderTree'];
    };
});
// ==UserScript==
// @name            控制网页使用限制 单独域名版
// @namespace       http://tampermonkey.net/
// @version         0.6
// @description     可以记录在不同的网站的使用时间，设置每个网站的可用时间，如果到达了指定的时间，页面会被遮挡而无法正常
// @author          lavaf
// @match 		    https://*/*
// @match		    http://*/*
// @grant           GM.setValue
// @grant           GM.getValue
// @grant           GM.deleteValue
// @grant           GM.listValues
// @grant           window.close
// @noframes
// @require         https://cdn.bootcss.com/jquery/3.4.1/jquery.js
// @require         https://cdn.bootcss.com/jqueryui/1.12.1/jquery-ui.js
// ==/UserScript==


(async function () {
    'use strict';
    //region load css
    addStyle("@import 'https://cdn.bootcss.com/jqueryui/1.12.1/jquery-ui.css'");

    function addStyle(style) {
        const head = document.getElementsByTagName("HEAD")[0];
        const ele = head.appendChild(window.document.createElement('style'));
        ele.innerHTML = style;
        return ele;
    }

    //endregion load css
    //region function data
    let usage;

    /**
     *
     * @return {Promise<void>}
     */
    async function deleteData() {
        try {
            // noinspection JSUnresolvedVariable
            if (GM !== undefined && GM.deleteValue !== undefined && typeof GM.deleteValue == 'function') {
                // noinspection JSUnresolvedVariable,JSUnresolvedFunction
                await GM.deleteValue(key);
            }
        } catch (e) {
            // console.log(log_key, 'error', e)
        }
    }

    /**
     *
     * @returns {Promise<null|String>}
     */
    async function getData() {
        try {
            // noinspection JSUnresolvedVariable
            if (GM !== undefined && GM.getValue !== undefined) {
                // noinspection JSUnresolvedVariable,JSCheckFunctionSignatures
                return await GM.getValue(key).catch((reason => {
                    console.log(log_key, 'error in promise catch', reason);
                }));
            }
        } catch (e) {
            console.log(log_key, 'error in try-catch getData', e)
        }
        return null;
    }

    /**
     *
     * @param key
     * @returns {Promise<null|JSON>}
     */
    async function getOtherData(key) {
        // console.log(log_key, 'getOtherData called:key:', key);
        try {
            // noinspection JSUnresolvedVariable
            if (GM !== undefined && GM.getValue !== undefined) {
                // noinspection JSUnresolvedVariable
                let t = await GM.getValue(key).catch((reason => {
                    console.log(log_key, 'error in promise catch', reason);
                }));
                if (t != null) {
                    return JSON.parse(t);
                }
            }
        } catch (e) {
            console.log(log_key, 'error in try-catch getOtherData', e)
        }
        return null;
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async function saveData(remedy=true) {
        // console.log(log_key, "savedData called")
        if (remedy)
            await remedyTimeDiff();

        let value = JSON.stringify(usage);
        try {
            // noinspection JSUnresolvedVariable
            if (GM !== undefined && GM.setValue !== undefined && typeof GM.setValue == 'function') {
                // noinspection JSUnresolvedVariable,JSUnresolvedFunction
                await GM.setValue(key, value);
            }
        } catch (e) {
            // console.log(log_key, 'error', e)
        }
    }

    /**
     *
     * @returns {Promise<null|*>}
     */
    async function getList() {
        try {
            // noinspection JSUnresolvedVariable
            if (GM !== undefined && GM.listValues !== undefined && typeof GM.listValues == 'function') {
                // noinspection JSUnresolvedVariable,JSUnresolvedFunction
                return await GM.listValues();
            }
        } catch (e) {
            // console.log(log_key, 'error', e)
        }
        return null;
    }

    /**
     * 新建一个对象
     * @return {{restrict: {single: undefined, domain, limit: undefined, interval: undefined}, statistics: {single: {date: undefined, time: number}|null, data: [], domain}}}
     */
    function newObject() {
        return {
            'restrict': {'domain': current_domain, 'limit': undefined, single: undefined, "interval": undefined},
            'statistics': {
                'domain': current_domain,
                'data': [],
                "single": {'time': 0, "date": undefined}
            }
        };
    }

    /**
     * 获取数据，解析成json对象
     * @return {{'restrict':{'domain':String,'limit':Number,'single':Number},statistics:{'domain':String,'data':[{year:Number,month:Number,day:Number,time:Number}]}}}
     */
    async function getUsage(save=false) {
        let data = await getData();
        // console.log(log_key, 'data:', data);
        if (data == null) {
            // console.log(log_key, "initUsage", "getData return null");
            let usage = newObject();
            if (save)
                await saveData();
            return usage;
        } else {
            let parse = JSON.parse(data);
            if (parse.restrict === undefined || parse.statistics === undefined) {
                console.log(log_key, 'script data is null');
                let usage = newObject();
                if (save)
                    await saveData();
                return usage;
            }
            return parse;
        }
    }

    async function initUsage() {
        usage = await getUsage();
        //console.log(log_key, 'after initUsage usage:', usage);
    }

    //endregion function data
    let message = "web_page_usage_init";
    if (window.top !== window.self) {
        //console.log(message,"Current environment is frame")
        return;
    }
    console.log("Web page usage start...");


    //region init key-url
    let current_h_href = location.href;
    //console.log(message, "current_h_href", current_h_href);
    let reg = new RegExp(/^(?:(?:ftp|http[s]?)?:\/\/)?(?:[\dA-Za-z-]+\.)+[\dA-Za-z-]+(?::[\d]{1,4})*/);
    let reg_localhost = new RegExp(/^(?:(?:ftp|http[s]?)?:\/\/)?localhost(?::[\d]{1,4})*/);
    let result = reg.exec(current_h_href);
    if (result == null) {
        //console.log(message, 'reg 不匹配');
        result = reg_localhost.exec(current_h_href);
        if (result == null) {
            //console.log(message, "result is null");
            return
        }
    }
    // console.log(log_key, "result:", result);
    let current_domain = result[0];
    let log_key = "web_page_usage->" + current_domain;
    let key_base = "f-usage-data-";
    let key = key_base + current_domain;
    //endregion key-url
    await initUsage();
    if (usage === undefined) {
        //console.log(log_key, "usage is null");
        usage = {};
    }
    let statistics_data = usage.statistics;
    let restrict_data = usage.restrict;
    let current_statistics = getDomainStatisticsTimeObject(statistics_data.data, current_domain);
    //console.log(log_key, 'current_statistics', current_statistics);
    //region ui
    let manager_panel = $("<div>", {id: "web_page_usage_manager_panel_id", 'translate': 'no'});
    manager_panel.appendTo('body');
    let web_page_usage_z_index = 10000001;
    let dialog_z_index = '10000001';
    let curtain_z_index = 10000000;
    manager_panel.css({
        'position': 'fixed',
        'left': '0',
        'top': '50%',
        'z-index': web_page_usage_z_index,
        'background-color': 'white',
        'border': '1px solid black'
    });

    //region statistics
    let statistics_panel = $('<div>');
    let totalTimeWasteLabel = $("<p>");
    totalTimeWasteLabel.appendTo(statistics_panel);
    let statistics_ol = $('<ol>', {id: "web-page-usage-statistics-ol"});
    statistics_ol.css({'height': "100px", 'overflow-y': 'scroll'});
    statistics_ol.appendTo(statistics_panel);
    let currentSecond = $("<span>");
    currentSecond.appendTo(statistics_panel);
    currentSecond.title = "当前计算时间的秒数 当前页面从打开直到现在的秒数"
    let clear_data_button = $("<button>");
    clear_data_button.text("clear");
    clear_data_button.click(async function () {
        clearInterval(statisticsTimer);
        clearInterval(checkTimer);
        await deleteData();
        await initUsage();
        statistics_data = usage.statistics;
        restrict_data = usage.restrict;
        current_statistics = getDomainStatisticsTimeObject(statistics_data.data, current_domain);
        startTimer();
    });
    clear_data_button.appendTo(statistics_panel);

    //endregion statistics
    statistics_panel.appendTo(manager_panel);
    let color = manager_panel.css('color');
    // console.log(color);
    let b = color === 'white' || color === 'rgb(255, 255, 255)';
    if (b) {
        manager_panel.css('color', 'black');
    }
    //region dialog
    let dialog = $("<div>", {id: 'web-page-usage-usage-dialog'});
    dialog.css("display", 'none')
    let dialog_ol = $("<ol>");
    dialog_ol.appendTo(dialog);
    dialog.appendTo('body');
    //endregion dialog
    //region restrictPanel
    let restrictPanelString = `<div id="web-page-usage-restrictPanel">
        <div id="web-page-usage-top"></div>
        <div id="web-page-usage-center">
            <button id="web-page-usage-view" class="notranslate" translate="no">查看数据</button>
        </div>
    </div>`;
    let restrictPanel = $($.parseHTML(restrictPanelString));
    let dialog_string =
        `<div style="display: none">
            到达单次使用限制了
        </div>`;
    let singleDialog = $($.parseHTML(dialog_string));
    singleDialog.css('display', 'none');
    singleDialog.appendTo('body');
    restrictPanel.appendTo(manager_panel);
    let top = $('div#web-page-usage-top');
    let input_string = `<div style="display: block">
			<div>
				<label for="add_input_data">url:</label>
				<input type="url" id="add_input_data">
			</div>
			<div>
				<label for="add_input_limit_time">time:</label>
				<input type="number" id="add_input_limit_time">
			</div>
			<button id="addButton">保存总时长使用限制</button>
			<div>
			    <label for="add_input_single_limit">single:</label>
			    <input type="number" id="add_input_single_limit">
            </div>
            <button id="save_single_limit">保存单次使用限制</button>
            <div>
                <label for="add_input_time_interval">interval:</label>
                <input id="add_input_time_interval" type="number">
            </div>
            <button id="save_single_interval">保存单次使用间隔</button>
		</div>`;

    let input_div = $($.parseHTML(input_string));
    input_div.appendTo(top);
    let saveButton = $("#addButton");
    let input_url = $("#add_input_data");
    input_url.val(current_domain);
    let input_limit = $("#add_input_limit_time");
    input_limit.val(restrict_data.limit);
    let inputSingleLimit = $("#add_input_single_limit");
    inputSingleLimit.val(restrict_data.single);
    let saveSingleInterval=$("#save_single_interval")
    saveButton.click(async function () {
        //获取input 中的内容
        let url = input_url.val();
        //console.log("添加限制", url, input_limit.val());
        let limit = parseInt(input_limit.val());
        // noinspection JSValidateTypes
        restrict_data.limit = limit;
        //console.log(log_key, "保存", limit, restrict_data);
        await saveData();

        if (getCurrentRestrict(url) == null) {
            //console.log(log_key, "limit添加成功");
            startTimer();
            printList();
            curtain.hide();
        } else {
            //console.log(log_key, 'limit更新时间');
        }
    });
    let saveSingleButton = $("#save_single_limit");
    saveSingleButton.click(async function () {
        stopTimer();
        //获取input 中的内容
        let url = input_url.val();
        // noinspection JSValidateTypes
        let single = parseInt(inputSingleLimit.val());
        if (single === -1) {
            restrict_data.single = undefined;
        } else {
            restrict_data.single = single;
        }
        await saveData();
        startTimer();
        printList();
        if (getCurrentRestrict(url) == null) {
            console.log(log_key, "single添加成功");
        } else {
            console.log(log_key, 'single更新时间');
        }
    });
    let interval=$("#add_input_time_interval")
    saveSingleInterval.click(async function () {
        stopTimer();
        let interval1 = parseInt(interval.val());
        if (interval1 === -1) {
            restrict_data.interval = undefined;
        } else {
            restrict_data.interval= interval1;
        }
        await saveData();
        startTimer();
        printList();
    })
    // let center = $('div#center');
    let viewStatisticsButton = $('button#web-page-usage-view');
    viewStatisticsButton.click(async function () {
        dialog_ol.children().remove();
        let list = await getList();
        console.log(log_key, 'list', list, 'type', typeof list);
        let space = 0;
        for (let index = 0; index < list.length; index++) {
            let temp = await getOtherData(list[index]);
            space += JSON.stringify(temp).length;
            // console.log(log_key, 'temp', temp);
            let domain_item = temp.statistics.domain;
            let ol_div = $("<details>");
            let ol_div_ol = $("<ol>");
            let timeData = temp.statistics['data'];
            if (timeData == null) {
                continue;
            }
            let timeSum = 0;
            for (let day = 0; day < timeData.length; day++) {
                let ol_div_ol_p = $("<p>");
                let tt = timeData[day];
                let t = tt['time'];
                timeSum += t;
                ol_div_ol_p.text(`${tt['year']}-${tt['month']}-${tt['day']}: ${format(t)}`);
                ol_div_ol_p.appendTo(ol_div_ol);
            }
            let ol_div_legend = $("<summary>", {text: domain_item + " " + format(timeSum) + (temp.restrict.limit !== undefined ? " ⌛" + temp.restrict.limit : "")});
            ol_div_legend.appendTo(ol_div);
            ol_div_ol.appendTo(ol_div);
            /**
             *
             * @type {Object}
             */
            let position = null;
            for (let y = 0; y < dialog_ol.children().length; y++) {
                let $1 = $(dialog_ol.children().get(y));
                if (parseInt($1.attr('data-timeData-sum')) < timeSum) {
                    position = $1;
                    break;
                }
            }
            if (position != null) {
                position.before(ol_div);
            } else
                ol_div.appendTo(dialog_ol);
            ol_div.attr('data-timeData-sum', timeSum);
        }

        if (dialog.dialog == null || typeof dialog.dialog !== "function") {
            dialog.dialog = function () {
                console.log(log_key, "启动对话框失败");
            }
        }
        dialog.dialog({
            title: '所有数据:数据占用空间' + space,
            modal: true,
            height: document.body.clientHeight / 2,
            width: document.body.clientWidth / 2,
            'minWidth': '300',
            open: function (event, ui) {

            },
            buttons: {
                'close': function () {
                    $(this).dialog("close");
                }
            }
        });
        let elementsByClassName = document.getElementsByClassName('ui-dialog');
        for (let i = 0; i < elementsByClassName.length; i++) {
            if (elementsByClassName[i].innerText.indexOf("所有数据") >= 0)
                elementsByClassName[i].style.zIndex = dialog_z_index
        }
    });
    viewStatisticsButton.dblclick(function () {
        clearInterval(statisticsTimer);
    });
    let bottom = $('<div>', {
        "id": "web-page-usage-bottom"
    });
    bottom.css({'height': "100px"});
    let ol = $("<ol>", {
        id: 'web-page-usage-restrictPanel-ol'
    });
    ol.appendTo(bottom);
    bottom.appendTo(restrictPanel);
    printList();

    //endregion restrictPanel
    function printList() {
        let restrictDatum = restrict_data.limit;
        if (ol.children().length !== 0)
            ol.children().remove();
        if (restrictDatum != null) {
            let li = $('<li>');
            li.text(restrict_data['domain'] + " limit:" + format(restrictDatum) + " " + restrictDatum + "s");
            li.appendTo(ol)
        }
        if (restrict_data.single != null) {
            let li = $('<li>');
            li.text(restrict_data['domain'] + " single:" + format(restrict_data.single) + " " + restrict_data.single + "s");
            li.appendTo(ol)
        }
        if (restrict_data.interval != null) {
            let li=$("<li>")
            li.text(restrict_data['domain'] + " interval:" + format(restrict_data.interval) + " " + restrict_data.interval + "s")
            li.appendTo(ol);
        }
    }

    //region button
    let button = $('<button>', {
        id: 'web-page-usage-toggle',
        text: '打开',
        'translate': 'no',
        'class': 'notranslate'
    });
    button.css({
        'position': 'fixed',
        'top': '50%',
        'left': 0,
        'z-index': web_page_usage_z_index
    });
    let show = true;

    function showOrHide() {
        if (!show) {
            let top = button.css('top');
            let height = button.css('height');
            let height2 = innerHeight;
            let left = button.css('width')
            // console.log(log_key,'showOrHide',top,height);
            manager_panel.css('left', left);
            let height3 = parseInt(manager_panel.css('height'));
            console.log(log_key, "height2", height2, "height3", height3)
            manager_panel.css('top', (height2 - height3) / 2);
            manager_panel.show();
            show = true;
        } else {
            manager_panel.hide();
            show = false
        }
    }

    button.click(function () {
        showOrHide();
        if (show) {
            printToday();
            addPrintTimer();
        } else {
            clearInterval(printTimer);
        }
    });
    button.appendTo('body');
    //endregion button
    let curtain = $('<div>', {
        height: '100%',
        width: '100%',
    });

    curtain.css({
        'background-color': 'black',
        'position': 'fixed',
        'top': 0,
        'left': 0,
        'z-index': curtain_z_index,
        'color': 'white',
        "text-align": "center",
        'display': 'grid',
        'align-items': 'center',
        'font-size': '50px'
    });
    curtain.text("超时");
    curtain.appendTo('body');
    curtain.hide();
    showOrHide();
    if (restrict_data.interval != null) {
        let currentDate = new Date();
        let lastDate =new Date(statistics_data.single.date) ;
        console.log(log_key,"current",currentDate,"last",lastDate)
        let m = (currentDate - lastDate) / 1000;
        console.log(log_key, "差", m);
        if (m < restrict_data.interval) {
            reachTimeLimit();
            curtain.text("超时,请等待" + format(restrict_data.interval));
            console.log(log_key, "请等待一段时间之后");
            return;
        } else {
            statistics_data.single.time=0;
            statistics_data.single.date=new Date();
            await saveData(false);
        }
    }
    //endregion ui
    //region start timer
    let statisticsTimer;
    let checkTimer;
    let counter = 0;
    startTimer();
    let printTimer;

    //endregion start timer
    /**
     * 获取已经添加到ol列表中的域名，然后从数据中获取当天的消息，然后打印出来，只会做已经打印出来的，后面添加的消息不会处理，除非重新打开
     */
    function addPrintTimer() {
        //console.log(log_key, 'addPrintTimer called');
        printTimer = setInterval(async function () {
            let child = statistics_ol.children();
            for (let j = 0; j < child.length; j++) {
                // console.log(log_key, 'printToday:local_usage:', local_usage);
                let item_li = $(child[j]);
                let domain_ui = item_li.children().get(0);
                let local_usage = await getOtherData(key_base + domain_ui.innerText);
                if (local_usage.statistics === undefined || local_usage.restrict === undefined) {
                    continue;
                }
                let today = getTodayStatisticsTimeObject(local_usage);
                if (today == null) {
                    continue;
                }
                let todayElement = today.time;
                let currentTime = format(todayElement);
                let time_ui = $(item_li.children().get(1));
                if (time_ui.text() !== currentTime) {
                    time_ui.text(currentTime);
                }
                // noinspection EqualityComparisonWithCoercionJS
                if (item_li.attr('data-time') != todayElement) {
                    time_ui.animate({'background-color': 'red'}, '500');
                    time_ui.animate({'background-color': 'white'}, '500');
                    item_li.attr('data-time', todayElement);
                }
            }
        }, 2000);
    }

    /**
     * 监听当前页面
     */
    function addStatisticTimer() {
        //console.log(log_key, 'addStatisticTimer called');
        statisticsTimer = setInterval(async function () {
            // console.log(log_key, "over-all called");
            current_statistics.time++;
            counter++;
            if (statistics_data.single == null) {
                alert("版本问题，需要卸载当前脚本，重新安装")
            } else {
                statistics_data.single.time++;
                statistics_data.single.date = new Date();
            }
            await saveData();
            let current = format(current_statistics.time);
            if (button.text() !== current)
                button.text(current);
            if (navigator.userAgent.indexOf('Android') < 0) {
                button.animate({'opacity': (current_statistics.time % 10) / 20 + 0.5}, '500');
                button.animate({'opacity': 1}, '500');
            }
            if (show) {
                currentSecond.text(current_statistics.time % 60 + " " + (counter));
            }
        }, 1000);
    }

    function reachTimeLimit() {
        curtain.show();
        stopTimer();
    }
    /**
     * 检测当前页面是否超时
     */
    function addCheckRestrictTimer() {
        //console.log(log_key, "addCheckRestrictTimer called");
        checkTimer = setInterval(function () {

            if (restrict_data.limit != null) {
                if (current_statistics.time >= restrict_data.limit) {
                    console.log(log_key, "超时");
                    curtain.text("超过设定的"+format(restrict_data.limit)+"限制")
                    // GM_notification(current_domain+"超时了",function () {
                    //     window.close();
                    // })
                    reachTimeLimit();
                    return;
                }
            }
            //console.log(log_key, "restirct single", restrict_data.single, "statistics single", statistics_data.single.time)
            if (restrict_data.single !== undefined && statistics_data.single.time >= restrict_data.single) {
                console.log(log_key, "到达连续使用限制");
                reachTimeLimit();
                curtain.text("超过连续使用限制" + format(restrict_data.single));
                singleDialog.dialog({
                    resizable: false,
                    height: "auto",
                    width: 400,
                    modal: true,
                    buttons: {
                        "continue": async function () {
                            console.log(log_key,'interval',restrict_data.interval);
                            if (restrict_data.interval != null) {
                                window.close();
                            } else {
                                $(this).dialog("close");
                                curtain.hide();
                                statistics_data.single.time = 0;
                                statistics_data.single.date = new Date();
                                //console.log(log_key, "restrict single", restrict_data.single, "statistics single", statistics_data.single.time)
                                await saveData(false);
                                //console.log(log_key, "restrict single", restrict_data.single, "statistics single", statistics_data.single.time)
                                startTimer();
                            }

                        },
                        'close': function () {
                            $(this).dialog("close");
                            window.close();
                        }
                    }
                });
                // GM_notification({'title':"管理","text":current_domain+"超过单次使用限制"}, function () {
                //     window.close();
                // })
                let elementsByClassName = document.getElementsByClassName('ui-dialog');
                for (let i = 0; i < elementsByClassName.length; i++) {
                    if (elementsByClassName[i].innerHTML.indexOf("到达") >= 0)
                        elementsByClassName[i].style.zIndex = dialog_z_index
                }
            }
        }, 1000)

    }

    function startTimer() {
        console.log(log_key, "startTimer called");
        addStatisticTimer();
        addCheckRestrictTimer();
    }

    function stopTimer() {
        //console.log(log_key, 'stopTimer called');
        if (statisticsTimer != null)
            clearInterval(statisticsTimer);
        if (checkTimer != null) {
            clearInterval(checkTimer);
        }
    }

    async function printToday() {
        statistics_ol.children().remove();
        let list = await getList();
        let total = 0;
        for (let i = 0; i < list.length; i++) {
            let temp = await getOtherData(list[i]);
            // console.log(log_key, 'printToday:temp:', temp);
            if (temp.statistics === undefined || temp.restrict === undefined) {
                continue;
            }
            let domainName = temp.statistics.domain;
            let today = getTodayStatisticsTimeObject(temp);
            if (today == null) {
                continue;
            }
            let todayTime = today.time;
            total += todayTime;
            let currentTimeString = format(todayTime);
            let li_string =
                `<li id="li-${i}" style="padding: 5px">
                    <span style="margin-right: 50px">${domainName}</span>
                    <span style="float: right">${currentTimeString}</span>
                </li>`;
            let item_li = $($.parseHTML(li_string));
            /**
             *
             * @type {Object}
             */
            let position = null;
            for (let y = 0; y < statistics_ol.children().length; y++) {
                let $1 = $(statistics_ol.children().get(y));
                if (parseInt($1.attr('data-time')) < todayTime) {
                    position = $1;
                    break;
                }
            }
            if (position != null) {
                position.before(item_li);
            } else
                // ol_div.appendTo(dialog_ol);
                item_li.appendTo(statistics_ol);
            item_li.attr('data-time', todayTime);
            item_li.attr('title', todayTime)
        }
        totalTimeWasteLabel.text("今天所有的网页的时间总和:" + format(total))
    }

    function format(time) {
        let unit = ['s', 'm', 'h', 'd'];
        let flag = 0;
        while (time >= 60) {
            time = time / 60;
            flag++;
        }
        return time.toFixed(1) + " " + unit[flag];
    }

    /**
     * 获取time limit 的对象
     * @param domain
     * @return {null|number}
     */
    function getCurrentRestrict(domain) {
        if (restrict_data.limit !== undefined) {
            return restrict_data.limit;
        }
        return null;
    }

    async function remedyTimeDiff() {
        // console.log(log_key, 'remedyTimeDiff called');
        let data = await getUsage();
        // console.log(log_key, 'data:', data);
        if (data == null) {
            //console.log(log_key, 'saveData failed due to getData failed');
            return null;
        } else {
            let remote = getTodayStatisticsTimeObject(data);
            if (remote == null) {
                return;
            }
            if (remote.time > current_statistics.time) {
                current_statistics.time += (remote.time - current_statistics.time);
            }
            let single = data.statistics.single;
            if (data == null) {
                return;
            }
            if (single.time > statistics_data.single.time) {
                statistics_data.single.time += (single.time - statistics_data.single.time);
            }
        }
    }

    /**
     *
     * @param usage
     * @return {null|{}}
     */
    function getTodayStatisticsTimeObject(usage) {
        let data = usage.statistics.data;
        if (data === undefined) {
            return null;
        }
        //检查今天的是否存在
        let today = new Date();
        for (let j = 0; j < data.length; j++) {
            let time_day = data[j];
            if (time_day.year === today.getFullYear() &&
                time_day.month === today.getMonth() + 1
                && time_day.day === today.getDate()) {
                return time_day;
            }
        }
        return null;
    }

    /**
     * 获取当前域的统计信息，没有就新建一个返回
     * @param {Array} dataSource
     * @param {Object} domain
     */
    function getDomainStatisticsTimeObject(dataSource, domain) {
        let j;
        for (j = 0; j < dataSource.length; j++) {
            let time_day = dataSource[j];
            let today = new Date();
            if (time_day.year === today.getFullYear() &&
                time_day.month === today.getMonth() + 1
                && time_day.day === today.getDate()) {
                return time_day;
            }
        }
        if (j === dataSource.length) {
            //console.log(log_key, "新建当天统计对象", domain);
            let date = new Date();
            let current_statistics = {
                "year": date.getFullYear(),
                "month": date.getMonth() + 1,
                "day": date.getDate(),
                "time": 0
            };
            statistics_data.data.push(current_statistics);
            return current_statistics;
        }
    }

    window.addEventListener("visibilitychange", async function () {
        if (document.visibilityState === "visible") {
            //console.log(log_key, "visible");
            //重新获取了数据
            await initUsage();
            if (usage === undefined) {
                //console.log(log_key, "usage is undefined");
                usage = {};
            } else {
                //console.log(log_key, "usage isn't undefined");
            }
            statistics_data = usage.statistics;
            restrict_data = usage.restrict;
            //更新统计，因为在别的页面可能也可能增加了时间
            current_statistics = getDomainStatisticsTimeObject(statistics_data.data, current_domain);
            // current_statistics = getDomainStatisticsTimeObject(statistics_data.data, current_domain);
            if (restrict_data.limit == null) {
                //console.log(log_key, "addStatisticTimer currentRestrict is null");
            } else {
                //console.log(log_key, 'current:', current_statistics.time, 'limit:', restrict_data.limit);
                if (current_statistics.time >= restrict_data.limit) {
                    //console.log(log_key, "已经超时，不在启动计时");
                    curtain.show();
                    return
                }
            }
            startTimer();
        } else {
            //console.log(log_key, "invisible");
            //暂停计时更能
            stopTimer();
        }
    });
    //测试功能
    document.body.onfullscreenchange = function (ev) {
        console.log(ev)
    }
})();

/**
 * IQR Result encapsulation, exposing adjudication functions
 *
 * Image data should be loaded by an AJAX call that returns the literal data,
 * not a path.
 *
 * for image load progress status, see: http://usablica.github.io/progress.js/
 *
 * @param is_example: Boolean flag for whether or not this is a view of example
 *                    data, in contrast to data in the IQR working index.
 *
 */
function QueryView(container, ingest_progress_zone, status_inst, uid, catNMs) {
    Object.call(this);

    var inst = this;

    this.container = container;
    this.ingest_progress_zone = ingest_progress_zone;
    this.status_inst = status_inst;
    this.uid = uid;
    this.catNMs = catNMs;

    // image ``src`` reference to use for display in an <img>.
    this.image_preview_data = null;
    // link to statically hosted file for full view
    this.static_view_link = null;
    // If we have received image preview data yet
    this.image_loaded = false;
    // Used for image view size clamping
    // -> this is 1 if height > width, 0 if otherwise.
    this.img_long_side = 0;

    this.loading_gif = "static/img/loading.gif";

    //
    // View Layout
    //
    // float view container
    this.float_div = $('<div id="float_div_'+this.rank+'" style="display:none; vertical-align: top"/>');
    this.float_div.appendTo($(container));

    // top-level container
    this.result = $('<div id="iqr_res" class="iqr-result"/>');
    this.result.appendTo($(container));

    // image container image data and adjudication buttons
    this.image_container = $('<div class="iqr-result-img-container"/>');
    this.image_data_view = $('<img>');
    // Showing loading GIF by default until image preview actually loaded via
    // ajax call.
    this.image_data_view.attr('src', this.loading_gif);

    this.result.append(this.image_container);
    this.image_container.append(this.image_data_view);


    //
    // Control
    //
    // link click controls
    this.image_data_view.click(function () {
        inst.ingest_query();
    });

    // Update to initial view from the server's state
    this.update_view();

    return this;
}

QueryView.prototype.ingest_query = function() {
    var inst = this;

    var message_prefix = "Ingesting file selected query Image: ";
    var bar = new ActivityBar(inst.ingest_progress_zone,
                              message_prefix+"Ingesting...");
    bar.on();

    $.ajax({
        url: "query_ingest_file",
        type: 'POST',
        data: {
            fid: inst.uid
        },
        success: function(data) {
            bar.on(message_prefix+"Complete");
            bar.stop_active("success");
            bar.progress_div.fadeOut('slow', function () {
                bar.remove();
            });
            inst.status_inst.update_view();

            inst.container.slideUp();
            $('#ingest_progress_zone').slideDown();
            $('#status_zone').slideDown();
            $('#control_zone').slideDown();

            inst.status_inst.update_target_list(inst.catNMs);
            // alert_info('data[q_target]: ' + data['q_target']);
            inst.status_inst.query_target_dropdown.val(data['q_target']);
            inst.status_inst.query_target_dropdown.attr('disabled', 'disabled');
            // inst.status_inst.query_target_dropdown.removeAttr('disabled');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            bar.on("ERROR: "+errorThrown);
            bar.stop_active("danger");
            alert_error("Error during file upload: "
                        + jqXHR.responseText);
        }
    });
};


/**
 * Update the view of this element based on current state.
 */
QueryView.prototype.update_view = function () {
    var inst = this;

    // helper function for display based on explicit settings
    function update_image()
    {
        inst.image_data_view.attr('src', inst.image_preview_data);

        var data_veiw_len = 192;
        var data_veiw_len_str = data_veiw_len.toString() + 'px';

        // balance side scaling.
        if (inst.img_long_side) {
            inst.image_data_view.css('height', data_veiw_len_str);
        }
        else
        {
            inst.image_data_view.css('width', data_veiw_len_str);
        }
    }

    if (this.image_loaded)
    {
        update_image();
    }
    else
    {
        // Get the preview image information from the server
        $.ajax({
            url: "get_data_preview_image",
            data: {
                uid: this.uid,
                query_flag: true
            },
            success: function (data) {
                // Check for failures
                if  (!data.success) {
                    alert_error("Image fetch error: " + data.message);
                }
                else {
                    inst.image_preview_data = data.static_preview_link;
                    inst.static_view_link = data.static_file_link;

                    inst.image_loaded = true;
                    inst.img_long_side =
                        parseInt(data.shape[1]) > parseInt(data.shape[0]);
                }
                update_image();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert_error("Failed to load preview image for ID " + inst.uid
                        + ": " + errorThrown);
                inst.image_preview_data = "broken-image-src";
                update_image();
            }
        });
    }
};
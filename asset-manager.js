(function ($) {
	$.fn.assetManager = function (params) {
		var options = $.extend({}, $.fn.assetManager.defaults, params);

		function getAssetsViaJSON() {

			$.ajax({
				url: $('#assets_' + options.current_directory).attr("href"), 
				data: {
					filter: options.filter,
					sort: options.sort
				}, 
				dataType: 'json',
				success: function (resp) {
					$('#assets_' + options.current_directory)
						.parent()
							.addClass("expanded")
							.find("ul:eq(0)")
								.show()
							.end()
						.end()
						.parents("li.directory")
							.parent("ul")
								.show();

					$("#am-gallery").empty();

					if (resp.status === "FAILURE") {
						$("<p />").addClass("message info").text(resp.message).appendTo("#am-gallery");
					} else {
						$.each(resp.data.assets, function (i, val) {

							var asset = $("<a />").addClass("asset-item").attr({
								title: val.name,
								href: val.src,
								rel: 'assets-group'
							});

							if (val.is_image) {
								asset.addClass("image");
							}

							$("<img />").attr({
								src: val.thumbnail_src,
								alt: val.name
							}).appendTo(asset);

							if ($(this).closest(".tbcontainer").length === 0) {
								$("img", asset).attr({
									alt: "",
									width: val.width,
									height: val.height
								});
							}

							asset.append('<span class="asset-name">' + val.name + '</span>');

							asset.appendTo("#am-gallery");

							if (i % 3 === 2 || i === resp.data.assets.length - 1) {
								$("#am-gallery").children("a.asset-item").wrapAll('<div class="ui-helper-clearfix"></div>');
							}
						});
					}
					
					if (resp.data && resp.data.permissions.create) {
						$("#createAssetsDirectory").button("enable");
						$("#createAssets").button("enable");
					} else {
						$("#createAssetsDirectory").button("disable");
						$("#createAssets").button("disable");
					}

					if (resp.data && resp.data.permissions.archive && !options.stop_archive) {
						$("#archiveAssetsDirectory").button("enable");

						$("a.asset-item").append('<span class="archive-asset">X</span>');

						$("a.asset-item span.archive-asset").click(function (e) { 
							e.preventDefault();
							$(this).parent().fadeOut('fast');
							$(this).parent().remove();
							$.post("/assets/ajaxarchiveasset", { asset_id: $(this).parent().attr('href') }, function () {
								if ($("#am-gallery a.asset-item").length === 0) {
									$("#am-gallery").html('<p class=\"message info\">There are no assets in this folder. Would you like to create some?</p>');
								}
							});
						});
					}
					else {
						$("#archiveAssetsDirectory").button("disable");
					}
				
					options.asset_load();
				},
				error: function (xhr, status, err) {
					$('<p class="message info" />').html(xhr.responseText).appendTo("#am-gallery");
				}
			});
		}

		/* initialize UI handlers */
		$("#am-tree").find("ul:gt(1)").hide();

		$("#am-gallery-toolbar button").button();

		$("#filter_by").change(function () {
			options.filter = $(this).val();
			getAssetsViaJSON();
		});

		$("#sort_by").change(function () {
			options.sort = $(this).val();
			getAssetsViaJSON();
		});

		$("li.directory").delegate("a", "click.asset-manager", function (event) {
			event.preventDefault();
			event.stopPropagation();

			options.current_directory = $(this).attr("id").replace(/^assets_/, '');

			if ($(this).parent().hasClass("root")) {
				$(this).parent().find("ul:gt(0)").hide();
				options.is_root = true;
			} else	{
				$(this).closest("ul").find("ul").hide();
				options.is_root = false;
			}

			$("li.expanded").removeClass("expanded");

			$("#am-gallery").children().fadeOut('fast');

			if ($("#filter_by").length) {
				$("#filter_by").val("none");
				options.filter = "none";
			}

			if ($("#sort_by").length) {
				$("#sort_by").val("dateDescending");
				options.sort = "dateDescending";
			}

			$("#am-gallery-location").html('');
			$(this).parents("li.directory").each(function (index, item) {
				$("#am-gallery-location").prepend('<span>' + $(item).find('a:eq(0)').text() + '</span>&nbsp;&raquo;&nbsp;');
			});

			getAssetsViaJSON();

		});

		$("#createAssetsDirectory").click(function () {
			$("#createAssetsDirectoryDialog").dialog({
				height: 175,
				width: 350,
				modal: true,
				buttons: {
					"Add Folder": function () {
						var post_data = {
								folder_name: $("#folder_name").val(),
								directory: options.current_directory,
								parent: options.current_directory
							},
							folder_href,
							folder_regexp;

						if (options.current_directory.match("directory")) {

							folder_href = $('a#assets_' + post_data.directory).attr("href");

							folder_regexp = /\/parent\/(\w+)\//i;

							if (folder_regexp.test(folder_href)) {
								post_data.parent = folder_regexp.exec(folder_href)[1];
							}
						}

						$.getJSON("/assets/ajaxcreateassetdirectory", post_data, function (result) {

							if (result.status === "SUCCESS") {
								var current_directory_container = $('a#assets_' + post_data.directory).parent(),
									new_folder_element = $('<li class="directory collapsed" />');

								$("<a />").attr({
									id: "assets_directory_" + result.data.directory_id,
									href: "/assets/ajaxgetassets/parent/" + post_data.parent + "/directory/directory_" + result.data.directory_id
								}).html(post_data.folder_name).appendTo(new_folder_element);

								// Check if the parent already has a set of subfolders
								if (current_directory_container.find("ul:eq(0)").length > 0) {
									current_directory_container.find("ul:eq(0)").append(new_folder_element);
								} else {
									current_directory_container.append(new_folder_element.wrap('<ul class="am-file-tree" />'));
								}
							}

							if ($("#msgbox").length && $("#msgbox").messageBox) {
								$("#msgbox").messageBox("option", "title", result.status);
								$("#msgbox").messageBox("option", "messages", result.message);
								$("#msgbox").messageBox("show");
							}
							else {
								alert(result.status + ": " + result.message);
							}

							$("#folder_name").val('');
						});

						$(this).dialog("close");
					},
					Cancel: function () {
						$(this).dialog("close");
					}
				}
			});
		});

		$("#createAssets").click(function () {
			$("#createAssetsDialog").dialog({
				height: 300,
				width: 480,
				modal: true,
				open: function (event, ui) {
					var self = $(this);
					$('input[type="submit"]', self).button();

					$(".cancel_upload").one("click", function (event) {
						event.preventDefault();
						self.dialog("close");
					});
				},
				close: function (event, ui) {
					if (options.isRoot) {
						options.currentDirectory = options.parentContext;
					}

					getAssetsViaJSON();

					// This resets the file input field
					$('input[type!="submit"]', this).val("");
				}
			});
		});

		$('#uploadAssetsForm').ajaxForm({
			beforeSubmit: function (a, f, o) {

				var folder_href, folder_regexp;

				$("#upload_directory").val(options.current_directory);
				$("#upload_parent").val(options.current_directory);

				if ($("#upload_directory").val().match("directory")) {

					folder_href = $('a#assets_' + $("#upload_directory").val()).attr("href");
					folder_regexp = /\/parent\/(\w+)\//i;

					if (folder_regexp.test(folder_href)) {
						$("#upload_parent").val(folder_regexp.exec(folder_href)[1]);
					}
				}
				
				$("#spinner").spinner("container", "#createAssetsDialog");
				$("#spinner").spinner("show");
			},
			success: function (data) {
				$("#spinner").spinner("hide");
				$("#spinner").spinner("container", ".appcontainer");
				$("#createAssetsDialog").dialog("close");
			}
		});

		$("#archiveAssetsDirectory").click(function () {
			if ($("#am-gallery a").size() !== 0) {
				alert("A folder must be empty in order to archive it.  Please archive the assets inside this folder.");
			} else {
				$("#archiveAssetsDirectoryDialog").dialog({
					resizable: false,
					height: 160,
					modal: true,
					buttons: {
						"Okay": function () {
							$.post("/assets/ajaxarchiveassetdirectory", { dir: options.current_directory }, function (result) {

								// TODO Case: archive folder directly under the root of the tree
								var navigateTo = $('a#assets_' + options.current_directory).parents("li:eq(1)").find("a:eq(0)");
								$('a#assets_' + options.current_directory).parent().remove();
								navigateTo.click();
							});

							$(this).dialog("close");
						},
						Cancel: function () {
							$(this).dialog("close");
						}
					}
				});
			}
		});

		/* end UI initializers */
		return $(this).each(function () {
			// Initial load
			options.is_root = true;
			options.current_directory = null;

			$(this).setFilter = function (filter_type) {
				options.filter = filter_type;
			}

			if (options.initialFolder) {
				options.is_root = false;
				$('#assets_' + options.initialFolder).trigger('click');
			}
			else {
				options.current_directory = $("#am-tree > ul.am-file-tree > li.directory > a").attr("id").replace(/^assets_/, '');
				getAssetsViaJSON();
			}
		});
	};

	$.fn.assetManager.defaults = {
		filter: 'none',
		sort: 'dateDescending',
		stop_archive: false,
		asset_load: function () {
			tb_init('a.asset-item.image');
		}
	};

}(jQuery));
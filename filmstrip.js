$.fn.drawFilmstrip = function() {

    function repeat(str, num) {
        return new Array(num + 1).join(str);
    }

    return this.each(function() {
        var $filmstrip = $('> div', this).css('overflow', 'hidden'),
            $slider = $filmstrip.find('> ul'),
            $items = $slider.find('> li'),
            $single = $items.filter(':first'),

            singleWidth = $single.outerWidth(),
            visible = Math.ceil($filmstrip.innerWidth() / singleWidth), // note: doesn't include padding or border
            currentPage = 5,
            pages = Math.ceil($items.length / visible);

        //console.debug("Visible is %s", visible);
        //console.debug("var pages is %s", pages);
        //console.debug("Resetting visible to one");
        visible = 1;
        //console.debug("Resetting pages to ten");
        pages = 10;


        // 1. Pad so that 'visible' number will always be seen, otherwise create empty items
        if (($items.length % visible) != 0) {
            $slider.append(repeat('<li class="empty" />', visible - ($items.length % visible)));
            $items = $slider.find('> li');
        }

        // 2. Top and tail the list with 'visible' number of items, top has the last section, and tail has the first
        $items.filter(':first').before($items.slice(-visible).clone().addClass('cloned'));
        $items.filter(':last').after($items.slice(0, visible).clone().addClass('cloned'));
        $items = $slider.find('> li'); // reselect

        // 3. Set the left position to the first 'real' item
        $filmstrip.scrollLeft(singleWidth * visible * 5);

        // 4. paging function
        function gotoPage(page) {
            //console.debug("Inside gotoPage %s", page);
            var dir = page < currentPage ? -1 : 1,
                n = Math.abs(currentPage - page),
                left = singleWidth * dir * visible * n;
            //console.debug("Left is %s", left);
            if (page > pages || (page == 0 && left == -98)) {
                return;
            }
            $filmstrip.filter(':not(:animated)').animate({
                scrollLeft: '+=' + left
            }, 500, function() {
                //console.debug("Inside filter");
                $(".back,.forward").fadeTo("fast", "1.0");
                //$(".back,.forward").show();
                if (page == 0) {
                    //console.debug("Page is zero; I will not scroll any more to the right");
                    return;
                    //console.debug("Page is zero; pages = %s", pages);
                    $filmstrip.scrollLeft(singleWidth * visible * pages);
                    page = pages;
                } else if (page > pages) {
                    //console.debug("Page is %s and is > pages %s", page, pages);
                    $(".forward").hide();
                    return;
                    //$filmstrip.scrollLeft(singleWidth * visible);
                    // reset back to start position
                    //console.debug("Resetting back to one");
                    page = 1;

                }
                //console.debug("Page is %s", page);
                //console.debug("Current page is %s", currentPage);
                currentPage = page;

                //console.debug("Exiting filter");

                if (page == 1) {
                    $(".back").fadeTo("fast", "0.5");
                } else if (page == 10) {
                    $(".forward").fadeTo("fast", "0.5");
                }
            });
            //console.debug("Exiting gotoPage...");
            return false;
        }

        $filmstrip.after('<a class="arrow back">&lt;</a><a class="arrow forward">&gt;</a>');

        // 5. Bind to the forward and back buttons
        $('a.back', this).live("click", function() {
            return gotoPage(currentPage - 1);
        });

        $('a.forward', this).live("click", function() {
            return gotoPage(currentPage + 1);
        });

        // create a public interface to move to a specific page
        $(this).bind('goto', function(event, page) {
            gotoPage(page);
        });
    });
};
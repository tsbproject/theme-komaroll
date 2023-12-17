"use strict";

// Class Definition
var Base = function () {

    var show = 'show';
    var active = 'active';

    var $body = $('body');

    /**
     * Page loader
     *--------------------------------------------------------------*/
    var loader = function() {
        $('#loader').fadeOut(1000);
    }

    /**
     * Sidebar toggler
     *--------------------------------------------------------------*/
    var sidebar = function() {
        var toggled = false;

        $('.sidebar-toggler').on('click', function() {
            toggled = !toggled;

            $(this).toggleClass(active);
            $body.attr('data-sidebar-toggle', toggled ? 'true' : null);
        });
    }

    /**
     * Toggle search results
     *--------------------------------------------------------------*/
    var search = function() {
        $('#search_input').on('click', function(e) {
            e.stopPropagation();
            $body.attr('data-search-results', 'true');
        });

        $('.search').on('click', function(e) {
            e.stopPropagation();
        });

        $body.on('click', function() {
            $(this).removeAttr('data-search-results');
        });
    }

    /**
     * Initialize theme settings
     * Plugin: Settings
     *--------------------------------------------------------------*/
    var initSettings = function() {
        // If you want to remove settings from the theme, remove or comment below line.
        $body.settings();
    }

    /**
     * Initialize scrollbars
     * Plugin: Perfect scrollbar [https://perfectscrollbar.com/]
     *--------------------------------------------------------------*/
    var initScroll = function() {
        $('[data-scroll="true"]').each(function() {
            // Bind perfect scrollbar with element.
            new PerfectScrollbar(this, {
                wheelSpeed: 2,
                swipeEasing: true,
                wheelPropagation: false,
                minScrollbarLength: 40
            });
        });
    }

    /**
     * Initialize swiper slider
     * Plugin: Swiper [https://swiperjs.com/]
     *--------------------------------------------------------------*/
    var initSwiper = function() {
        var desktopSpace = 24;
        var mobileSpace = 16;

        $('.swiper').each(function() {
            var slides = parseInt(this.getAttribute('data-swiper-slides'));
            var carousel = this.parentElement;
            var loop = this.getAttribute('data-swiper-loop');
            var autoplay = this.getAttribute('data-swiper-autoplay');
            var next = carousel.querySelector('.swiper-button-next');
            var prev = carousel.querySelector('.swiper-button-prev');
            var pagination = carousel.querySelector('.swiper-pagination');
            var paginationType = this.getAttribute('data-swiper-pagination') ? this.getAttribute('data-swiper-pagination') : 'bullets';
            var scrollbar = carousel.querySelector('.swiper-scrollbar');

            // Set responsive slide
            var desktop = slides;
            var tablet = 1;
            var mobile = 2;

            if (slides === 1) {
                tablet = mobile = 1;

            } else {
                if (slides > 1 && slides < 5) {
                    tablet = 2;
                    mobile = 1;
                } else if (slides >= 5) {
                    tablet = 3;
                    mobile = 2;
                }
            }

            // Swiper options
            var options = {
                speed: 500,
                slidesPerView: mobile,
                slidesPerGroup: mobile,
                spaceBetween: mobileSpace,

                a11y: true,

                breakpoints: {
                    576: {
                        slidesPerView: tablet,
                        slidesPerGroup: tablet
                    },
                    1200: {
                        slidesPerView: desktop,
                        slidesPerGroup: desktop,
                        spaceBetween: desktopSpace
                    }
                }
            }

            if (loop) {
                options.loop = loop;
            }

            if (autoplay) {
                options.autoplay = {
                    delay: 5000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                };
            }

            // Add next & prev controls in swiper option if element is exist.
            if (next && prev) {
                options.navigation = {
                    nextEl: next,
                    prevEl: prev,
                }
            }

            // Add pagination control in swiper option if element is exist.
            if (pagination) {
                options.pagination = {
                    el: pagination,
                    type: paginationType,
                    clickable: true,
                    dynamicBullets: true
                }
            }

            // Add scrollbar control in swiper option if element is exist.
            if (scrollbar) {
                options.scrollbar = {
                    el: scrollbar,
                    draggable: true
                }
            }

            // Bind swiper slider with element.
            new Swiper(this, options);
            
        });
    }

    /**
     * Initialize dropzone file upload
     * Plugin: Dropzone [https://www.dropzone.dev/js/]
     *--------------------------------------------------------------*/
    var initDropzone = function() {
        var fileUpload = document.querySelector('.dropzone');

        if (fileUpload) {
            Dropzone.autoDiscover = false;
            new Dropzone('.dropzone', { url: "/file/post" });
        }
    }

    /**
     * Bootstrap tab to function link material tab
     *--------------------------------------------------------------*/
    var materialTab = function() {
        var matTabs = 'mat-tabs';
        var matLine = 'mat-tabs__line';

        var $matLine = $('<span>', { class: matLine });
        var $matTabs = $('.' + matTabs);
        var $navLink = $('.nav-link');

        // Set mat line on active nav link
        $matTabs.each(function() {
            var width = $(this).find('.nav-link.active').outerWidth();
            $matLine.stop().css({ width: width });
            $matLine.appendTo(this);
        });

        // Nav link click
        $navLink.on('click', function() {
            var $this = $(this);
            var $line = $this.closest('.' + matTabs).find('.' + matLine);

            $line.stop().css({
                left: $this.position().left,
                width: $this.outerWidth()
            });
        });
    }

    /**
     * Handle browser back & forward event to change page view
     *--------------------------------------------------------------*/
    var pageChange = function() {
        $(window).on('popstate', function() {
            var href = window.location.href;
            var url = href.split('/').pop();
            if (url) {
                changePageView(url);
            }
        });
    }

    /**
     * Prevent page loading with AJAX 
     *--------------------------------------------------------------*/
    var routing = function() {
        var link = 'a:not([href^="#"])a:not([href^="mail"])a:not([href^="tel"]):not([href^="javascript"]):not(.external):not([target])';

        $(document).on('click', link, function(e) {
            e.preventDefault();
            e.stopPropagation();

            var sidebar = $(this).closest('#sidebar');
            var url = $(this).attr('href') !== 'undefined' ?  $(this).attr('href') : null;
            if (url) {
                var history = window.history;
                history.pushState("", "", url);

                changePageView(url, sidebar);
            }
        });
    }

    /**
     * Change page view
     * @param {string} url 
     * @param {Object} sidebar 
     *--------------------------------------------------------------*/
    var changePageView = function(url, sidebar) {
        var $lineLoader = $('#line_loader');
        $lineLoader.show().animate({ 
            width: 20 + 80 * Math.random() + "%" 
        }, 200);

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'html'
        }).done(function(html, status, response) {
            if (status === 'success' && response.status == 200) {
                html = $('<div>' + html + '</div>');
                $('head title').html(html.find('title').html());
                $('#wrapper').html(html.find('#wrapper').html());
                $('html, body').animate({
                    scrollTop: 0
                }, 100);

                // Initialize click events
                reInit();
                // Change skin of the components on route change.
                changeComponentSkin();

                // Initialize Dashboard chart
                Dashboard.init();
            }
        }).fail(function() {
            window.location.href = '404.html';
        }).always(function() {
            if ((sidebar && sidebar.length) && $(window).width() < 992) {
                $('.sidebar-toggler').toggleClass(active);
                $body.removeAttr('data-sidebar-toggle');
            }

            $lineLoader.animate({width:"100%"}, 200).fadeOut(300, function() {
                $(this).width("0");
            });
        });
    }

    /**
     * Change component default skin
     *--------------------------------------------------------------*/
    var changeComponentSkin = function() {
        var skin = Utils.getLocalItem('skin');
        var header = document.getElementById('header');
        var sidebar = document.getElementById('sidebar');

        if (skin && header && sidebar) {
            header.setAttribute('data-header', skin.header);
            sidebar.setAttribute('data-sidebar', skin.sidebar);
        }
    }

    /**
     * Reinitialize plugins and event on route change
     *--------------------------------------------------------------*/
    var reInit = function() {
        initScroll();
        initSwiper();
        initDropzone();
        materialTab();
        sidebar();
        search();

        if ($('.amplitude-play-pause').hasClass('amplitude-playing')) {
            var song = Amplitude.getActiveSongMetadata();
            $('[data-play-id]').removeClass(active);
            $('[data-play-id=' + song.id + ']').addClass(active);
        }
    }

    return {
        init: function() {
            loader();
            initSettings();
            reInit();
            pageChange();
            routing();
        }
    }

}();

// Class initialization on page load
$(document).ready(function() {
    Base.init();
});
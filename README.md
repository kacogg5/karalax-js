# Karalax
A library for styling html elements based on scroll position. v1.
Requires jQuery v3.5 or later

![the Karalax logo](https://github.com/kacogg5/karalax-js/assets/11723822/f0564236-f2f2-44ef-b3e2-7222fd4d5381)

## Usage
This is a very broad overview of Karalax's capabilities, and does not represent all features available within Karalax. It is an attempt to provide the bare minimum information to use Karalax within their own application.

Scroll-animated CSS properties are specified by `data-` tags on the html element itself. As of now, only a subset of css properties are animatible and each supported property uses a corresponding data tag name. For example, the `top` css feature is animated by specifying the `data-move-y` tag. `data-it-` tags are used for specifying initial property values and `data-c-` tags are a convention for commenting out karalax animations.

Animations are written in this format: `<start-frame>:<end-frame> <start-value>--<end-value> <animation-curve>`. Frames are akin to the number of pixels scrolled, and are used to specify when an animation starts and ends. The animation curve specifies the function along which an animation will progress. Possible values for animation curve are `linear`, `parabolic`, `revPara`(reverse parabolic), `hyperbolic`, `cosine`, `invCos`(inverted cosine), and `sqrRt`(Square Root).

A basic demonstration of usage is available at [this repo](https://github.com/kacogg5/kacogg5.github.io/)

var expected=`/*! CSS Used from: http://127.0.0.1:8080/test/index.css */
/*! @import http://127.0.0.1:8080/test/common.cssscreen, projection */
@media screen, projection{
body{background:#ccc;}
}
/*! end @import */
/*! @import http://127.0.0.1:8080/test/landscape.cssscreen and (orientation:portrait) */
@media screen and (orientation:portrait){
body{background:#aaa;}
}
/*! end @import */
/*! @import http://127.0.0.1:8080/test/skin.css */
.S_spetxt{color:#fa7d3c;}
body{background-color:#b4d66b;background-image:none;}
body{color:#333;text-decoration:none;}
a{color:#76a513;}
/*! end @import */
:AFTER{content:'after';background:#38c;}
html{height:100%;}
A{background:url(http://127.0.0.1:8080/test/logo.jpg);background-size:100%;animation:teatnamekey;}
@media screen and (min-width:500px){
a{width:16.666%;}
}
@media screen and (min-width:300px){
@media screen and (min-height:10px){
b{height:10px;}
}
}
body{font-family:"WBswficon";}
@media print{
i{font-size:10pt;}
}
/*! CSS Used from: http://127.0.0.1:8080/test/font.css */
i{font-family:'Cutive Mono';}
@media only screen and (max-width:480px){
b{font-size:20px;}
}
body{font-family:'Cutive Mono';}
/*! CSS Used from: Embedded ; media=print */
@media print{
i{color:#789;font-family:WBswficon;}
}
/*! CSS Used keyframes */
@-webkit-keyframes teatnamekey{0%{width:10px;}100%{height:10px;}}
@keyframes teatnamekey{0%{width:10px;}100%{height:10px;}}
/*! CSS Used fontfaces */
@font-face{font-family:'WBswficon';src:url("http://img.t.sinajs.cn/t6/style//images/common/font/swbficon.eot?id=141111232016");src:url("http://img.t.sinajs.cn/t6/style//images/common/font/swbficon.eot?id=141111232016#iefix")  format('embedded-opentype'), url("http://img.t.sinajs.cn/t6/style//images/common/font/swbficon.svg?id=141111232016")  format('svg'), url("http://img.t.sinajs.cn/t6/style//images/common/font/swbficon.woff?id=141111232016")  format('woff'), url("http://img.t.sinajs.cn/t6/style//images/common/font/swbficon.ttf?id=141111232016")  format('truetype');src:url("http://img.t.sinajs.cn/t6/style//images/common/font/swbficon.eot?id=141111232016") \\9;font-weight:normal;font-style:normal;}`
const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');
const yaml = require('js-yaml');
const MarkdownIt = require('markdown-it');
const markdownItAttrs = require('markdown-it-attrs');
const nib = require('nib');
const $ = require('gulp-load-plugins')();
const browserSync = require('browser-sync').create();
const autoprefixer = require('gulp-autoprefixer');
const nunjucks = require('gulp-nunjucks'); // 直接导入gulp-nunjucks

const isProd = process.env.NODE_ENV === 'production';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  typographer: true
});
md.use(markdownItAttrs);

const paths = {
  root: path.join(__dirname, '../'),
  src: path.join(__dirname, '../src/'),
  scripts: 'src/scripts/*.js',
  styles: 'src/styles/**/*.styl',
  assets: path.join(__dirname, '../src/assets'),
};

// 字体任务
function fonts() {
  return gulp.src([
      'node_modules/font-awesome/fonts/fontawesome-webfont.*'
    ])
    .pipe(gulp.dest('dist/fonts/'));
    // 移除$.size()调用
}

// 脚本任务
function scripts() {
  return gulp.src([
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/velocity-animate/velocity.js',
      paths.scripts
    ])
    .pipe($.terser())  // 使用terser替代uglify，更好地支持ES6+
    .pipe($.concat({ path: 'scripts.js', stat: { mode: 0666} }))
    .pipe(gulp.dest('dist/assets/'));
    // 移除$.size()调用
}

// 样式任务
function styles() {
  return gulp.src([
      'node_modules/font-awesome/css/font-awesome.min.css',
      paths.styles
    ])
    .pipe($.stylus({ use: nib(), compress: true, import: ['nib']}))
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe($.concat({ path: 'styles.css', stat: { mode: 0666} }))
    .pipe(gulp.dest('dist/assets/'));
    // 移除$.size()调用
}

// HTML任务
function html() {
  const MarkdownType = new yaml.Type('tag:yaml.org,2002:md', {
    kind: 'scalar',
    construct: function (text) {
      return md.render(text);
    },
  });
  const YAML_SCHEMA = yaml.Schema.create([MarkdownType]);
  const context = matter(fs.readFileSync('data.yaml', 'utf8'), { schema: YAML_SCHEMA }).data;
  return gulp.src(['template/index.html', 'template/print.html'])
    .pipe(nunjucks.nunjucksCompile(context)) // 使用新的API
    .pipe($.htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest('dist'));
    // 移除$.size()调用
}

// 监视文件变化
function watch() {
  browserSync.init({
    server: "./dist"
  });
  gulp.watch(paths.scripts, scripts).on('change', browserSync.reload);
  gulp.watch(paths.styles, styles).on('change', browserSync.reload);
  gulp.watch(['template/*.html', 'data.yaml'], html).on('change', browserSync.reload);
  gulp.watch(["dist/*.html", "dist/assets/*.*"]).on('change', browserSync.reload);
}

// 定义构建任务
const build = gulp.parallel(fonts, scripts, styles, html);

// 开发任务（构建+监视）
const dev = gulp.series(build, watch);

// 默认任务
exports.default = isProd ? build : dev;

// 导出各个任务供单独使用
exports.fonts = fonts;
exports.scripts = scripts;
exports.styles = styles;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.dev = dev;

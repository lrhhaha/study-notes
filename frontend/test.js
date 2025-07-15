



const data = {
  show: true
}

const str = `
<ul>
  <% if (obj.show) { %>
    <% for (var i = 0; i < obj.users.length; i++) { %>
      <li>
        <a href="<%= obj.users[i].url %>">
          <%= obj.users[i].name %>
        </a>
      </li>
    <% } %>
  <% } else { %>
    <p>不展示列表</p>
  <% } %>
</ul>
`

function tmpl(str, data) {

    var fn = new Function("data",

    "var p = []; p.push('" +

    str
    .replace(/[\r\t\n]/g, "")
    .replace(/<%=(.*?)%>/g, "');p.push($1);p.push('")
    .replace(/<%/g, "');")
    .replace(/%>/g,"p.push('")
    + "');return p.join('');");

    return fn(data);
};

console.log(tmpl(str, data))
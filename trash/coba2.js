// for (let index = 0; index < 32 / 4; index++) {
//   for (let jindex = 0; jindex < 4; jindex++) {
//     console.log(jindex);
//   }
// }

let i = 20;
j = 20;
// console.log(i, j);
{
  /* <section class="recommendation">
          <h2> Rekomendasi Baru </h2>
          <%let i=0>
            <%let j=0>
              <%for (let i=0; i < data.length/4; i++) {%>
                <div class="groups">
                  <%for (let j=0; j < data.length; j++) {%>
                    <%let item=data[j]%>
                      <div class="goods">
                        <div class="picture">
                          <img src="/images/<%=item.pictures ? item.pictures : 'nothing.png'%>" alt="" class="mini">
                        </div>
                        <div class="title">
                          <%=item.title%>
                        </div>
                        <div class="price">
                          <%=currencyFormatter.format(item.price,currencyFormat)%>
                        </div>
                      </div>
                      <%}%>
                </div>
</section> */
}

{
  /* <section class="recommendation">
          <h2> Rekomendasi Baru </h2>
          <%let i=0%>
            <%let j=0%>
              <%let k=1%>
                <%while (j < data.length/4) {%>
                  <%k=1%>
                    <div class="groups">
                      <%while (k<=4) {%>
                        <%if(i< data.length) {%>
                          <%let item=data[i]%>
                            <div class="goods">
                              <div class="picture">
                                <img src="/images/<%=item.pictures ? item.pictures : 'nothing.png'%>" alt=""
                                  class="mini">
                              </div>
                              <div class="title">
                                <%=item.title%>
                                  <%console.log(`i=${i}`)%>
                              </div>
                              <div class="price">
                                <%=currencyFormatter.format(item.price,currencyFormat)%>
                              </div>
                            </div>
                            <%k++%>
                              <%i++%>
                                <%if (k%4==0) j++%>
                                  <%}%>
                                    <%}>
                    </div>
                    <%}%>
        </section> */
}

{
  /* <section class="recommendation">
          <h2> Rekomendasi Baru </h2>
          <%let i=0%>
            <%let j=0%>
              <%let k=1%>
                <%while (j < data.length/4) {%>
                  <%k=1%>
                    <div class="groups">
                      <%while (k<=4) {%>
                        <%if (i< data.length) {%>
                          <%let item=data[i]%>
                            <div class="goods">
                              <div class="picture">
                                <img src="/images/<%=item.pictures ? item.pictures : 'nothing.png'%>" alt=""
                                  class="mini">
                              </div>
                              <div class="title">
                                <h3>
                                  <%=item.title%>
                                </h3>
                              </div>
                              <div class="price">
                                <h3>
                                  <%=currencyFormatter.format(item.price,currencyFormat)%>
                                </h3>
                              </div>
                            </div>
                            <%}%>
                              <%k++%>
                                <%i++%>
                                  <%if (k%4==0) j++%>
                                    <%}%>
                    </div>
                    <%}%>
        </section> */
}

/* background-color: rgba(222, 236, 236, 1); */

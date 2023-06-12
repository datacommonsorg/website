import Footer from "components/layout/Footer";
import Header from "components/layout/Header";
import Page from "components/layout/Page";
import PageBody from "components/layout/PageBody";
import WorldContent from "./WorldContent";

const World = () => {
  return (
    <Page>
      <Header />
      <PageBody>
        <WorldContent />
      </PageBody>
      <Footer />
    </Page>
  );
};
export default World;

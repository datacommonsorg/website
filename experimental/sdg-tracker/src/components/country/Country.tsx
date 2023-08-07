import AppFooter from "../layout/AppFooter";
import AppHeader from "../layout/AppHeader";
import AppLayout from "../layout/AppLayout";
import AppLayoutContent from "../layout/AppLayoutContent";

const World = () => {
  return (
    <AppLayout>
      <AppHeader selected="country" />
      <AppLayoutContent>
        <h3 style={{ margin: "2rem auto", textAlign: "center" }}>
          Coming soon...
        </h3>
      </AppLayoutContent>
      <AppFooter />
    </AppLayout>
  );
};
export default World;

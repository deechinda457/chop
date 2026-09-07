import { Redirect } from 'expo-router';

export default function ShoppingRoute() {
  return <Redirect href="/(tabs)/pantry?view=need" />;
}

import { User } from "lucide-react-native";
import { Text, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";

export default function HomeScreen() {
  return (
    <View>
      <View>
        <User color="#fff" />

        <Text> Login To Your Account</Text>
      </View>
      <View>
        <TextInput
          placeholder="User Name"
          autoCapitalize="none"
          autoComplete="username"
          secureTextEntry={false}
          returnKeyType="next"
          accessibilityLabel="User name"
          maxLength={15}
        />
      </View>
      <View>
        <TextInput>
          placeholder="password"
          autoCapitalize="none"
          autoComplete="password"
          secureTextEntry={false}
          returnKeyType="next"
          accessibilityLabel="password"
          
          maxLength={15}
        </TextInput>
      </View>
    </View>
    
  );
}

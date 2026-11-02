import { User } from "lucide-react-native";
import { TextInput } from "react-native-gesture-handler";

export default function LoginScreen() {
  return (
    <view className="items-center">
      <User color="#fff" />

      <text> Login To Your Account</text>

      <TextInput
        placeholder="User Name"
        autoCapitalize="none"
        autoComplete="username"
        secureTextEntry={false}
        returnKeyType="next"
        accessibilityLabel="User name"
        maxLength={15}
      />
    </view>
  );
}

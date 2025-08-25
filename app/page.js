import DashboardBuilderApp from '../components/DashboardBuilderApp'
import AuthGate from '../components/AuthGate'

export default function Home() {
	return (
		<AuthGate>
			<DashboardBuilderApp />
		</AuthGate>
	)
}


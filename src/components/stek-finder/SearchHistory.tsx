import { StekResult } from '@/hooks/useStekFinder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Trash2 } from 'lucide-react';

interface SearchHistoryProps {
  history: StekResult[];
  onClear: () => void;
}

const SearchHistory = ({ history, onClear }: SearchHistoryProps) => {
  if (history.length === 0) return null;

  return (
    <Card className="bg-black/20 border-white/10 text-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg">
          <Clock className="mr-2 text-sky-400" />
          Recente analyses
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-white/50 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Wissen
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{item.location.name}</p>
                  <p className="text-xs text-white/50">
                    {item.confidence}% zekerheid
                    {item.timestamp && ` · ${new Date(item.timestamp).toLocaleDateString('nl-NL')}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchHistory;
